package queue

import (
	"context"
	"sync"
)

// Manager owns the concurrency pool and the set of in-flight cancel funcs,
// keyed by download ID. app.go holds exactly one Manager.
type Manager struct {
	pool    *Pool
	mu      sync.Mutex
	cancels map[string]context.CancelFunc
}

// NewManager creates a Manager whose pool allows maxConcurrent simultaneous jobs.
func NewManager(maxConcurrent int) *Manager {
	return &Manager{
		pool:    NewPool(maxConcurrent),
		cancels: make(map[string]context.CancelFunc),
	}
}

// Start derives a cancellable context from parent, registers it under id, and
// submits job to the pool. job is always called with that context; the cancel
// func is released (and removed from the map) the moment job returns,
// regardless of success, failure, or explicit cancellation.
func (m *Manager) Start(parent context.Context, id string, job func(ctx context.Context)) {
	ctx, cancel := context.WithCancel(parent)
	m.mu.Lock()
	m.cancels[id] = cancel
	m.mu.Unlock()

	m.pool.Submit(func() {
		defer func() {
			m.mu.Lock()
			delete(m.cancels, id)
			m.mu.Unlock()
			cancel()
		}()
		job(ctx)
	})
}

// Cancel cancels the in-flight download with the given id, if any. It reports
// whether such a download was actually running.
func (m *Manager) Cancel(id string) bool {
	m.mu.Lock()
	cancel, ok := m.cancels[id]
	m.mu.Unlock()
	if !ok {
		return false
	}
	cancel()
	return true
}

// SetConcurrency resizes the underlying worker pool.
func (m *Manager) SetConcurrency(max int) {
	m.pool.Resize(max)
}
