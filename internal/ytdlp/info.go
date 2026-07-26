package ytdlp

import (
	"context"
	"encoding/json"
	"fmt"
	"os/exec"
	"strings"

	"vid-snatch/internal/binaries"
	"vid-snatch/internal/settings"
	"vid-snatch/internal/types"
)

// ytJSON is the subset of `yt-dlp -j` output we need.
type ytJSON struct {
	Title        string      `json:"title"`
	ID           string      `json:"id"`
	Thumbnail    string      `json:"thumbnail"`
	Duration     float64     `json:"duration"`
	ExtractorKey string      `json:"extractor_key"`
	Formats      []rawFormat `json:"formats"`
}

// GetInfo fetches metadata and a filtered format list for url.
func GetInfo(ctx context.Context, bin binaries.Binaries, url string, s settings.Data) (types.MediaInfo, error) {
	url = NormalizeURL(url)

	args := []string{"-j", "--no-playlist", "--no-warnings"}
	if s.Proxy != "" {
		args = append(args, "--no-check-certificate", "--proxy", s.Proxy)
	}
	if s.Browser != "" {
		args = append(args, "--cookies-from-browser", s.Browser)
	}
	if s.ConfigPath != "" {
		args = append(args, "--config-location", s.ConfigPath)
	}
	args = append(args, url)

	out, err := exec.CommandContext(ctx, bin.YtdlpPath, args...).Output()
	if err != nil {
		return types.MediaInfo{}, fmt.Errorf("yt-dlp info failed: %w", detailExecErr(err))
	}

	var raw ytJSON
	if err := json.Unmarshal(out, &raw); err != nil {
		return types.MediaInfo{}, fmt.Errorf("parsing yt-dlp output: %w", err)
	}

	prefs := FormatPrefs{
		PreferredVideoQuality: s.PreferredVideoQuality,
		PreferredVideoCodec:   s.PreferredVideoCodec,
		ShowMoreFormats:       s.ShowMoreFormats,
	}
	videoFormats, audioFormats := FilterFormats(raw.Formats, prefs)

	return types.MediaInfo{
		ID:           raw.ID,
		Title:        raw.Title,
		Thumbnail:    raw.Thumbnail,
		DurationSec:  raw.Duration,
		ExtractorKey: raw.ExtractorKey,
		VideoFormats: videoFormats,
		AudioFormats: audioFormats,
	}, nil
}

// detailExecErr surfaces yt-dlp's actual stderr message instead of a bare exit
// code, since *exec.ExitError.Stderr is populated automatically by .Output().
func detailExecErr(err error) error {
	if exitErr, ok := err.(*exec.ExitError); ok && len(exitErr.Stderr) > 0 {
		return fmt.Errorf("%s", strings.TrimSpace(string(exitErr.Stderr)))
	}
	return err
}
