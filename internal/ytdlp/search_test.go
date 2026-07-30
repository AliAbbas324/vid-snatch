package ytdlp

import "testing"

func TestMapSearchResults(t *testing.T) {
	entries, err := parseFlatLines([]byte(searchFixture))
	if err != nil {
		t.Fatalf("fixture parse error: %v", err)
	}
	results := mapSearchResults(entries)
	if len(results) != 1 {
		t.Fatalf("expected 1 result, got %d", len(results))
	}
	r := results[0]
	if r.ID != "n61ULEU7CO0" || r.Channel != "Lofi Girl" || r.URL == "" || r.Thumbnail == "" {
		t.Fatalf("unexpected mapping: %+v", r)
	}
	if r.DurationSec != 22258.0 {
		t.Fatalf("expected durationSec 22258.0, got %v", r.DurationSec)
	}
}
