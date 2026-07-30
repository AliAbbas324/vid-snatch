package ytdlp

import (
	"fmt"
	"path/filepath"
	"regexp"
	goruntime "runtime"
	"strings"

	"vid-snatch/internal/binaries"
	"vid-snatch/internal/settings"
	"vid-snatch/internal/types"
)

var illegalFilenameChars = regexp.MustCompile(`[/\\:*?"<>|]`)

// sanitizeTitle strips characters illegal in filenames on any target platform,
// since the -o template embeds it directly.
func sanitizeTitle(title string) string {
	title = illegalFilenameChars.ReplaceAllString(title, "_")
	title = strings.TrimSpace(title)
	if title == "" {
		return "download"
	}
	return title
}

// containerFallback picks the output container for a video+audio merge,
// falling back to mkv when the combination can't be muxed into the video's
// own container.
func containerFallback(videoExt, audioExt string) string {
	switch {
	case videoExt == "mp4" && audioExt == "opus":
		return "mkv"
	case videoExt == "webm" && (audioExt == "m4a" || audioExt == "mp4"):
		return "mkv"
	default:
		return videoExt
	}
}

// rangeArg builds a --download-sections time-range expression. yt-dlp accepts
// "inf" as an open-ended bound, so a missing start/end doesn't require knowing
// the video's total duration up front.
func rangeArg(start, end string) string {
	if start == "" && end == "" {
		return ""
	}
	if start == "" {
		start = "0"
	}
	if end == "" {
		end = "inf"
	}
	return fmt.Sprintf("*%s-%s", start, end)
}

func embedThumbnailAllowed() bool {
	return goruntime.GOOS != "darwin"
}

// appendSharedArgs appends the flags common to all three modes, in the order
// the reference recipes use.
func appendSharedArgs(args []string, req types.DownloadRequest, bin binaries.Binaries, s settings.Data, allowThumbnail bool) []string {
	args = append(args, "--ffmpeg-location", bin.FfmpegPath)
	if s.Browser != "" {
		args = append(args, "--cookies-from-browser", s.Browser)
	}
	if s.ConfigPath != "" {
		args = append(args, "--config-location", s.ConfigPath)
	}
	args = append(args, "--embed-metadata")
	if allowThumbnail && embedThumbnailAllowed() {
		args = append(args, "--embed-thumbnail")
	}
	if rng := rangeArg(req.RangeStart, req.RangeEnd); rng != "" {
		args = append(args, "--download-sections", rng)
	}
	if req.WriteSubs {
		langs := "all"
		if req.SubLangs != "" {
			langs = req.SubLangs
		}
		args = append(args, "--write-subs", "--sub-langs", langs)
	}
	if s.Proxy != "" {
		args = append(args, "--no-check-certificate", "--proxy", s.Proxy)
	}
	if s.LimitRate != "" {
		args = append(args, "--limit-rate", s.LimitRate)
	}
	if s.SplitChapters {
		args = append(args, "--split-chapters")
	}
	return args
}

// BuildDownloadArgs builds the yt-dlp argument slice (always a []string, never
// a shell string) for req, plus the resulting output file extension. Pure and
// exec-free, so argument choice is unit-testable without spawning a process.
func BuildDownloadArgs(req types.DownloadRequest, bin binaries.Binaries, s settings.Data) ([]string, string, error) {
	title := sanitizeTitle(req.Title)
	url := NormalizeURL(req.URL)

	switch req.Mode {
	case "video":
		if req.VideoFormatID == "" {
			return nil, "", fmt.Errorf("video mode requires videoFormatId")
		}
		hasAudio := req.AudioFormatID != "" && req.AudioFormatID != "none"
		selector := req.VideoFormatID
		outExt := req.VideoExt
		if hasAudio {
			selector = req.VideoFormatID + "+" + req.AudioFormatID
			outExt = containerFallback(req.VideoExt, req.AudioExt)
		}
		args := []string{"-f", selector, "-o", filepath.Join(req.OutputDir, title+"."+outExt)}
		args = appendSharedArgs(args, req, bin, s, true)
		args = append(args, url)
		return args, outExt, nil

	case "audio":
		if req.AudioFormatID == "" || req.AudioFormatID == "none" {
			return nil, "", fmt.Errorf("audio mode requires audioFormatId")
		}
		outExt := req.AudioExt
		args := []string{"-f", req.AudioFormatID, "-o", filepath.Join(req.OutputDir, title+"."+outExt)}
		args = appendSharedArgs(args, req, bin, s, false)
		args = append(args, url)
		return args, outExt, nil

	case "extract":
		if req.ExtractFormat == "" {
			return nil, "", fmt.Errorf("extract mode requires extractFormat")
		}
		outExt := req.ExtractFormat
		allowThumb := outExt == "mp3" || outExt == "m4a"
		args := []string{"-x", "--audio-format", req.ExtractFormat}
		if req.ExtractQuality != "" {
			args = append(args, "--audio-quality", req.ExtractQuality)
		}
		args = append(args, "-o", filepath.Join(req.OutputDir, title+"."+outExt))
		args = appendSharedArgs(args, req, bin, s, allowThumb)
		args = append(args, url)
		return args, outExt, nil

	default:
		return nil, "", fmt.Errorf("unknown download mode %q", req.Mode)
	}
}
