package queue

import (
	"context"
	"sync"
	"testing"
	"time"
)

// TestBatch_RunsStrictlySequentially proves item 2 cannot start until item 1's
// Run has actually returned - not just that logs happen to print in order.
func TestBatch_RunsStrictlySequentially(t *testing.T) {
	bm := NewBatchManager()

	var mu sync.Mutex
	started := map[string]bool{}
	item1Started := make(chan struct{})
	release1 := make(chan struct{})
	item2Started := make(chan struct{})

	items := []BatchItem{
		{ID: "1", Run: func(ctx context.Context) {
			mu.Lock()
			started["1"] = true
			mu.Unlock()
			close(item1Started)
			<-release1 // stays blocked until the test explicitly releases it
		}},
		{ID: "2", Run: func(ctx context.Context) {
			mu.Lock()
			started["2"] = true
			mu.Unlock()
			close(item2Started)
		}},
	}

	bm.Start(context.Background(), "batch-a", items)

	<-item1Started

	// Give any (buggy) concurrent execution a real chance to happen before
	// asserting its absence - item 1 is genuinely still blocked on release1
	// the whole time, so this window can only catch a real sequencing bug,
	// never produce a false positive.
	select {
	case <-item2Started:
		t.Fatal("item 2 started before item 1 finished - not sequential")
	case <-time.After(100 * time.Millisecond):
	}

	close(release1)

	select {
	case <-item2Started:
	case <-time.After(2 * time.Second):
		t.Fatal("item 2 never started after item 1 completed")
	}
}

// TestBatch_CancelHaltsAndStopsRemaining proves cancelling the active item
// also prevents any subsequent item from starting.
func TestBatch_CancelHaltsAndStopsRemaining(t *testing.T) {
	bm := NewBatchManager()

	item1Started := make(chan struct{})
	item1Done := make(chan error, 1)
	var mu sync.Mutex
	item2Ran, item3Ran := false, false

	items := []BatchItem{
		{ID: "1", Run: func(ctx context.Context) {
			close(item1Started)
			<-ctx.Done()
			item1Done <- ctx.Err()
		}},
		{ID: "2", Run: func(ctx context.Context) {
			mu.Lock()
			item2Ran = true
			mu.Unlock()
		}},
		{ID: "3", Run: func(ctx context.Context) {
			mu.Lock()
			item3Ran = true
			mu.Unlock()
		}},
	}

	bm.Start(context.Background(), "batch-b", items)
	<-item1Started

	if ok := bm.Cancel("batch-b"); !ok {
		t.Fatal("expected Cancel to report the batch was running")
	}

	select {
	case err := <-item1Done:
		if err == nil {
			t.Fatal("expected item 1's context to report an error after cancel")
		}
	case <-time.After(2 * time.Second):
		t.Fatal("item 1 never observed cancellation")
	}

	// Give the batch goroutine a moment to finish unwinding past item 1
	// before checking it didn't proceed to items 2/3.
	time.Sleep(100 * time.Millisecond)
	mu.Lock()
	defer mu.Unlock()
	if item2Ran || item3Ran {
		t.Fatal("expected items 2 and 3 to never run after cancel")
	}
}

// TestBatchManager_IndependentBatches proves sequencing is only WITHIN a
// batch - two different batches must not serialize against each other.
func TestBatchManager_IndependentBatches(t *testing.T) {
	bm := NewBatchManager()

	release := make(chan struct{})
	batchAStarted := make(chan struct{})
	batchBDone := make(chan struct{})

	itemsA := []BatchItem{{ID: "a1", Run: func(ctx context.Context) {
		close(batchAStarted)
		<-release
	}}}
	itemsB := []BatchItem{{ID: "b1", Run: func(ctx context.Context) {
		close(batchBDone)
	}}}

	bm.Start(context.Background(), "batch-a", itemsA)
	<-batchAStarted // batch A is now blocked mid-item

	bm.Start(context.Background(), "batch-b", itemsB)

	select {
	case <-batchBDone:
		// batch B completed independently while A was still blocked - good.
	case <-time.After(2 * time.Second):
		t.Fatal("batch B never ran while batch A was blocked - batches are not independent")
	}

	close(release)
}

// TestBatch_PanicIsRecoveredAndBatchContinues proves a panicking item doesn't
// crash the batch goroutine (or, transitively, the process): it's logged and
// treated like any other per-item outcome (success or a normal application
// error already returns cleanly via app.go's fail() path) - only an explicit
// Cancel halts the sequence, so the batch continues to the next item rather
// than silently abandoning the rest of a playlist over one bad/buggy entry.
func TestBatch_PanicIsRecoveredAndBatchContinues(t *testing.T) {
	bm := NewBatchManager()

	var mu sync.Mutex
	item2Ran := false
	item2Done := make(chan struct{})

	items := []BatchItem{
		{ID: "1", Run: func(ctx context.Context) { panic("boom") }},
		{ID: "2", Run: func(ctx context.Context) {
			mu.Lock()
			item2Ran = true
			mu.Unlock()
			close(item2Done)
		}},
	}

	bm.Start(context.Background(), "batch-panic", items)

	select {
	case <-item2Done:
	case <-time.After(2 * time.Second):
		t.Fatal("item 2 never ran after item 1 panicked - panic should be contained, not halt the batch")
	}

	mu.Lock()
	defer mu.Unlock()
	if !item2Ran {
		t.Fatal("expected item 2 to run after item 1's panic was recovered")
	}
}
