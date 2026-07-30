package ytdlp

import (
	"context"
	"fmt"

	"vid-snatch/internal/binaries"
	"vid-snatch/internal/types"
)

// SearchVideos runs a YouTube search and returns up to limit video results.
// yt-dlp has no playlist-search extractor (confirmed via
// `yt-dlp --list-extractors`) - every result is a video.
func SearchVideos(ctx context.Context, bin binaries.Binaries, query string, limit int) ([]types.SearchResult, error) {
	target := fmt.Sprintf("ytsearch%d:%s", limit, query)
	entries, err := runFlatPlaylistJSON(ctx, bin, target)
	if err != nil {
		return nil, err
	}
	return mapSearchResults(entries), nil
}

// mapSearchResults is the pure mapping half of SearchVideos, split out so it's
// unit-testable without spawning yt-dlp.
func mapSearchResults(entries []rawFlatEntry) []types.SearchResult {
	results := make([]types.SearchResult, 0, len(entries))
	for _, e := range entries {
		results = append(results, types.SearchResult{
			ID:          e.ID,
			Title:       e.Title,
			URL:         e.URL,
			DurationSec: e.Duration,
			Thumbnail:   pickThumbnail(e),
			Channel:     e.Channel,
		})
	}
	return results
}
