// Package queue bounds how many downloads run concurrently and owns their
// cancellation.
package queue

import "sync"

// Pool is a semaphore-based worker pool bounding concurrent jobs. Resize is
// safe to call while jobs are in flight: each Submit captures its own
// semaphore reference so a resize never corrupts an already-acquired slot.
type Pool struct {
	mu  sync.RWMutex
	sem chan struct{}
}

// NewPool creates a pool allowing up to max concurrent jobs (minimum 1).
func NewPool(max int) *Pool {
	if max < 1 {
		max = 1
	}
	return &Pool{sem: make(chan struct{}, max)}
}

// Submit blocks until a slot is free, then runs job in a new goroutine.
func (p *Pool) Submit(job func()) {
	p.mu.RLock()
	sem := p.sem
	p.mu.RUnlock()

	sem <- struct{}{}
	go func() {
		defer func() { <-sem }()
		job()
	}()
}

// Resize changes the concurrency limit for future Submit calls.
func (p *Pool) Resize(max int) {
	if max < 1 {
		max = 1
	}
	p.mu.Lock()
	p.sem = make(chan struct{}, max)
	p.mu.Unlock()
}
