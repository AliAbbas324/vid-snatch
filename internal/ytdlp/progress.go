package ytdlp

import (
	"strconv"
	"strings"

	"vid-snatch/internal/types"
)

// progressLinePrefix matches the "download:" prefix template type baked into
// our --progress-template recipe (see download.go's progressArgs).
const progressLinePrefix = "PROGRESS "

// ParseLine parses one stdout line produced by our --progress-template recipe:
// "PROGRESS <percent> <speed> <eta>", e.g. "PROGRESS 45.2% 1.2MiB/s 00:12".
// ok is false for any line that isn't a progress line (most stdout is not).
func ParseLine(id, line string) (types.Progress, bool) {
	if !strings.HasPrefix(line, progressLinePrefix) {
		return types.Progress{}, false
	}
	fields := strings.Fields(strings.TrimPrefix(line, progressLinePrefix))
	if len(fields) < 3 {
		return types.Progress{}, false
	}
	percent, _ := strconv.ParseFloat(strings.TrimSuffix(fields[0], "%"), 64)
	return types.Progress{
		ID:      id,
		Percent: percent,
		Speed:   fields[1],
		ETA:     fields[2],
		Stage:   "downloading",
	}, true
}

// DetectStage reports a stage transition implied by a non-progress stdout
// line (yt-dlp prints these while ffmpeg post-processing runs).
func DetectStage(line string) (string, bool) {
	if strings.Contains(line, "[Merger]") || strings.Contains(line, "[ExtractAudio]") {
		return "processing", true
	}
	return "", false
}
