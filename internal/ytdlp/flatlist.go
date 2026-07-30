package ytdlp

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"os/exec"

	"vid-snatch/internal/binaries"
)

// rawFlatEntry mirrors one line of `yt-dlp -j --flat-playlist` output. The
// shape is identical whether the target is a real playlist URL or a
// `ytsearchN:query` pseudo-URL - only which optional fields are populated
// differs (playlist_* fields are empty for search results).
type rawFlatEntry struct {
	ID               string     `json:"id"`
	Title            string     `json:"title"`
	URL              string     `json:"url"`
	Channel          string     `json:"channel"`
	Uploader         string     `json:"uploader"`
	Duration         float64    `json:"duration"`
	Thumbnails       []rawThumb `json:"thumbnails"`
	PlaylistIndex    int        `json:"playlist_index"`
	PlaylistTitle    string     `json:"playlist_title"`
	PlaylistUploader string     `json:"playlist_uploader"`
}

type rawThumb struct {
	URL    string `json:"url"`
	Width  int    `json:"width"`
	Height int    `json:"height"`
}

// parseFlatLines parses newline-delimited JSON (one object per line) as
// produced by `yt-dlp -j --flat-playlist` - NOT a single JSON array, unlike
// plain `-j` in info.go which yields exactly one object.
func parseFlatLines(data []byte) ([]rawFlatEntry, error) {
	var entries []rawFlatEntry
	for _, line := range bytes.Split(bytes.TrimSpace(data), []byte("\n")) {
		line = bytes.TrimSpace(line)
		if len(line) == 0 {
			continue
		}
		var e rawFlatEntry
		if err := json.Unmarshal(line, &e); err != nil {
			return nil, fmt.Errorf("parsing yt-dlp flat-playlist output: %w", err)
		}
		entries = append(entries, e)
	}
	return entries, nil
}

// runFlatPlaylistJSON execs `yt-dlp -j --flat-playlist <target>` and parses
// stdout as newline-delimited JSON. target may be a real playlist URL or a
// `ytsearchN:query` pseudo-URL - both take the same code path.
func runFlatPlaylistJSON(ctx context.Context, bin binaries.Binaries, target string) ([]rawFlatEntry, error) {
	out, err := exec.CommandContext(ctx, bin.YtdlpPath, "-j", "--flat-playlist", target).Output()
	if err != nil {
		return nil, fmt.Errorf("yt-dlp failed: %w", detailExecErr(err))
	}
	return parseFlatLines(out)
}

// pickThumbnail returns the last (typically highest-resolution, by yt-dlp
// convention) entry of Thumbnails, or "" if none are present. The flat
// entries' single `thumbnail` field is consistently null in practice -
// `thumbnails[]` is what's actually populated.
func pickThumbnail(e rawFlatEntry) string {
	if len(e.Thumbnails) == 0 {
		return ""
	}
	return e.Thumbnails[len(e.Thumbnails)-1].URL
}
