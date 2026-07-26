package ytdlp

import "testing"

func TestMapPlaylistInfo(t *testing.T) {
	entries, err := parseFlatLines([]byte(playlistFixture))
	if err != nil {
		t.Fatalf("fixture parse error: %v", err)
	}
	info, err := mapPlaylistInfo(entries)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if info.Title != "Top Trending Videos of the Week" {
		t.Fatalf("expected title read from entry 0, got %q", info.Title)
	}
	if info.Uploader != "by YouTube" {
		t.Fatalf("expected uploader read from entry 0, got %q", info.Uploader)
	}
	if len(info.Entries) != 2 || info.Entries[0].Index != 1 || info.Entries[1].Index != 2 {
		t.Fatalf("expected 2 entries in order, got %+v", info.Entries)
	}
}

func TestMapPlaylistInfo_EmptyErrors(t *testing.T) {
	_, err := mapPlaylistInfo(nil)
	if err == nil {
		t.Fatal("expected an error for zero entries")
	}
}
