package ytdlp

import (
	"context"
	"fmt"

	"vid-snatch/internal/binaries"
	"vid-snatch/internal/types"
)

// GetPlaylistEntries lists a playlist's videos via a flat (fast, lightweight)
// listing - no per-video metadata is fetched here. A plain single-video URL
// degrades gracefully to a "playlist of one," not an error.
func GetPlaylistEntries(ctx context.Context, bin binaries.Binaries, url string) (types.PlaylistInfo, error) {
	url = NormalizeURL(url)

	raw, err := runFlatPlaylistJSON(ctx, bin, url)
	if err != nil {
		return types.PlaylistInfo{}, err
	}
	return mapPlaylistInfo(raw)
}

// mapPlaylistInfo is the pure mapping half of GetPlaylistEntries, split out so
// it's unit-testable without spawning yt-dlp.
func mapPlaylistInfo(raw []rawFlatEntry) (types.PlaylistInfo, error) {
	if len(raw) == 0 {
		return types.PlaylistInfo{}, fmt.Errorf("no videos found at that URL")
	}

	entries := make([]types.PlaylistEntry, 0, len(raw))
	for _, e := range raw {
		entries = append(entries, types.PlaylistEntry{
			ID:          e.ID,
			Title:       e.Title,
			URL:         e.URL,
			DurationSec: e.Duration,
			Thumbnail:   pickThumbnail(e),
			Index:       e.PlaylistIndex,
		})
	}

	return types.PlaylistInfo{
		Title:    raw[0].PlaylistTitle,
		Uploader: raw[0].PlaylistUploader,
		Entries:  entries,
	}, nil
}
