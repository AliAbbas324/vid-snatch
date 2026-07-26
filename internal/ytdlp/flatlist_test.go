package ytdlp

import "testing"

// searchFixture mirrors a real `yt-dlp -j --flat-playlist "ytsearch1:..."` line
// captured this session (trimmed to the fields we actually parse).
const searchFixture = `{"id": "n61ULEU7CO0", "title": "Best of lofi hip hop 2021", "url": "https://www.youtube.com/watch?v=n61ULEU7CO0", "duration": 22258.0, "channel": "Lofi Girl", "uploader": "Lofi Girl", "thumbnail": null, "thumbnails": [{"url": "https://i.ytimg.com/vi/n61ULEU7CO0/hq720.jpg", "width": 360, "height": 202}]}
`

// playlistFixture mirrors a real flat-playlist entry captured this session.
const playlistFixture = `{"id": "Vh4O04Bpovw", "title": "I Explored A Forgotten Space Colony", "url": "https://www.youtube.com/watch?v=Vh4O04Bpovw", "duration": 969.0, "playlist_index": 1, "playlist_title": "Top Trending Videos of the Week", "playlist_uploader": "by YouTube", "thumbnails": [{"url": "https://i.ytimg.com/vi/Vh4O04Bpovw/default.jpg", "width": 120, "height": 90}, {"url": "https://i.ytimg.com/vi/Vh4O04Bpovw/hqdefault.jpg", "width": 480, "height": 360}]}
{"id": "5TIp7oVKHq8", "title": "I spent a day with REALITY TV STARS", "url": "https://www.youtube.com/watch?v=5TIp7oVKHq8", "duration": 1158.0, "playlist_index": 2, "playlist_title": "Top Trending Videos of the Week", "playlist_uploader": "by YouTube", "thumbnails": []}
`

func TestParseFlatLines_SearchShape(t *testing.T) {
	entries, err := parseFlatLines([]byte(searchFixture))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(entries) != 1 {
		t.Fatalf("expected 1 entry, got %d", len(entries))
	}
	e := entries[0]
	if e.ID != "n61ULEU7CO0" || e.URL != "https://www.youtube.com/watch?v=n61ULEU7CO0" {
		t.Fatalf("unexpected entry: %+v", e)
	}
	if e.PlaylistIndex != 0 || e.PlaylistTitle != "" {
		t.Fatalf("search results should have no playlist_* fields, got %+v", e)
	}
	if got := pickThumbnail(e); got != "https://i.ytimg.com/vi/n61ULEU7CO0/hq720.jpg" {
		t.Fatalf("pickThumbnail = %q", got)
	}
}

func TestParseFlatLines_PlaylistShape(t *testing.T) {
	entries, err := parseFlatLines([]byte(playlistFixture))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(entries) != 2 {
		t.Fatalf("expected 2 entries, got %d", len(entries))
	}
	if entries[0].PlaylistIndex != 1 || entries[1].PlaylistIndex != 2 {
		t.Fatalf("expected ordered playlist_index 1,2, got %d,%d", entries[0].PlaylistIndex, entries[1].PlaylistIndex)
	}
	if entries[0].PlaylistTitle != "Top Trending Videos of the Week" {
		t.Fatalf("unexpected playlist_title: %q", entries[0].PlaylistTitle)
	}
	if got := pickThumbnail(entries[0]); got != "https://i.ytimg.com/vi/Vh4O04Bpovw/hqdefault.jpg" {
		t.Fatalf("expected pickThumbnail to take the LAST thumbnail entry, got %q", got)
	}
	if got := pickThumbnail(entries[1]); got != "" {
		t.Fatalf("expected empty thumbnail for entry with no thumbnails, got %q", got)
	}
}

func TestParseFlatLines_EmptyInput(t *testing.T) {
	entries, err := parseFlatLines([]byte("\n\n"))
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(entries) != 0 {
		t.Fatalf("expected 0 entries for blank input, got %d", len(entries))
	}
}
