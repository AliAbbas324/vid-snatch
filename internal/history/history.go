// Package history persists a record of finished downloads to
// ~/.vid-snatch/history.json, so completed/errored/cancelled rows survive an
// app restart and can be checked for duplicates before starting a new download.
package history

import (
	"encoding/json"
	"os"
	"path/filepath"
)

// maxEntries caps the stored history so the file can't grow unbounded over
// months of use - oldest entries are dropped first.
const maxEntries = 500

// Entry is one finished (done/error/cancelled) download.
type Entry struct {
	ID           string  `json:"id"`
	Title        string  `json:"title"`
	Thumbnail    string  `json:"thumbnail,omitempty"`
	OutputDir    string  `json:"outputDir"`
	SourceURL    string  `json:"sourceUrl"`
	Stage        string  `json:"stage"` // "done" | "error" | "cancelled"
	Percent      float64 `json:"percent"`
	ErrorMessage string  `json:"errorMessage,omitempty"`
	FinishedAt   int64   `json:"finishedAt"` // unix millis
}

func dir() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(home, ".vid-snatch"), nil
}

func path() (string, error) {
	d, err := dir()
	if err != nil {
		return "", err
	}
	return filepath.Join(d, "history.json"), nil
}

// Load reads every stored entry, oldest first. A missing file is not an
// error - it just means no history has been recorded yet.
func Load() ([]Entry, error) {
	p, err := path()
	if err != nil {
		return nil, err
	}
	raw, err := os.ReadFile(p)
	if os.IsNotExist(err) {
		return []Entry{}, nil
	}
	if err != nil {
		return nil, err
	}
	var entries []Entry
	if err := json.Unmarshal(raw, &entries); err != nil {
		return nil, err
	}
	return entries, nil
}

// Append records e, dropping the oldest entries beyond maxEntries.
func Append(e Entry) error {
	entries, err := Load()
	if err != nil {
		return err
	}
	entries = append(entries, e)
	if len(entries) > maxEntries {
		entries = entries[len(entries)-maxEntries:]
	}
	return save(entries)
}

// Clear removes every stored entry.
func Clear() error {
	return save([]Entry{})
}

func save(entries []Entry) error {
	d, err := dir()
	if err != nil {
		return err
	}
	if err := os.MkdirAll(d, 0o755); err != nil {
		return err
	}
	p, err := path()
	if err != nil {
		return err
	}
	raw, err := json.MarshalIndent(entries, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(p, raw, 0o644)
}
