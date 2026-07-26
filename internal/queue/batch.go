package queue

import (
	"context"
	"log"
	"sync"
)

// BatchItem is one unit of strictly-sequential work.
type BatchItem struct {
	ID  string
	Run func(ctx context.Context) // must block until this item is fully done
}

// Batch tracks the cancel func of whichever item is currently running, plus
// whether the batch has been told to stop.
type Batch struct {
	mu      sync.Mutex
	cancel  context.CancelFunc
	stopped bool
}

// BatchManager owns all in-flight batches, keyed by batch ID. Sequencing
// within a batch comes from running its items in a single goroutine, one at a
// time, with no worker pool involved - that absence is what guarantees strict
// order, as opposed to Manager/Pool which intentionally runs jobs concurrently.
// Independent batches are NOT serialized against each other.
type BatchManager struct {
	mu      sync.Mutex
	batches map[string]*Batch
}

// NewBatchManager creates an empty BatchManager.
func NewBatchManager() *BatchManager {
	return &BatchManager{batches: make(map[string]*Batch)}
}

// Start spawns one goroutine that walks items in order, one at a time.
// Cancelling the batch (via Cancel) cancels whichever item is currently
// running and prevents any subsequent item from starting - there is no
// per-item "skip but continue" mode.
func (bm *BatchManager) Start(parent context.Context, batchID string, items []BatchItem) {
	b := &Batch{}
	bm.mu.Lock()
	bm.batches[batchID] = b
	bm.mu.Unlock()

	go func() {
		defer func() {
			bm.mu.Lock()
			delete(bm.batches, batchID)
			bm.mu.Unlock()
		}()

		for _, item := range items {
			b.mu.Lock()
			stopped := b.stopped
			b.mu.Unlock()
			if stopped {
				return
			}

			ctx, cancel := context.WithCancel(parent)
			b.mu.Lock()
			b.cancel = cancel
			b.mu.Unlock()

			runItemSafely(ctx, item)
			cancel() // release this item's context regardless of outcome
		}
	}()
}

// runItemSafely invokes item.Run, recovering from a panic rather than letting
// it crash the whole desktop process. Auto-picked format IDs (built without
// the UI validation gate a manually-driven single download goes through) are
// the realistic source of a slice-index panic here - see app.go's guards,
// which this is the backstop for, not a substitute.
func runItemSafely(ctx context.Context, item BatchItem) {
	defer func() {
		if r := recover(); r != nil {
			log.Printf("queue: batch item %s panicked: %v", item.ID, r)
		}
	}()
	item.Run(ctx)
}

// Cancel cancels the currently-running item of batchID (if any) and halts the
// batch from starting further items. Reports whether batchID was running.
func (bm *BatchManager) Cancel(batchID string) bool {
	bm.mu.Lock()
	b, ok := bm.batches[batchID]
	bm.mu.Unlock()
	if !ok {
		return false
	}

	b.mu.Lock()
	b.stopped = true
	cancel := b.cancel
	b.mu.Unlock()

	if cancel != nil {
		cancel()
	}
	return true
}
