// Package binaries resolves the yt-dlp and ffmpeg executables this app shells out to.
package binaries

import (
	"fmt"
	"os"
	"os/exec"
)

// Binaries holds the resolved absolute paths to the external tools we depend on.
type Binaries struct {
	YtdlpPath  string
	FfmpegPath string
}

// Resolve finds yt-dlp and ffmpeg via VIDSNATCH_YTDLP_PATH/VIDSNATCH_FFMPEG_PATH
// env var overrides, falling back to PATH lookup. It returns a combined error
// naming exactly which binaries are missing and how to fix it; on error the
// returned Binaries is always the zero value.
func Resolve() (Binaries, error) {
	ytdlp, ytdlpErr := resolveOne("yt-dlp", "VIDSNATCH_YTDLP_PATH")
	ffmpeg, ffmpegErr := resolveOne("ffmpeg", "VIDSNATCH_FFMPEG_PATH")

	if ytdlpErr != nil || ffmpegErr != nil {
		msg := "required binaries not found:"
		if ytdlpErr != nil {
			msg += fmt.Sprintf("\n  - yt-dlp: %s (install it, or set VIDSNATCH_YTDLP_PATH to its location)", ytdlpErr)
		}
		if ffmpegErr != nil {
			msg += fmt.Sprintf("\n  - ffmpeg: %s (install it, or set VIDSNATCH_FFMPEG_PATH to its location)", ffmpegErr)
		}
		return Binaries{}, fmt.Errorf("%s", msg)
	}

	return Binaries{YtdlpPath: ytdlp, FfmpegPath: ffmpeg}, nil
}

func resolveOne(name, envVar string) (string, error) {
	if p := os.Getenv(envVar); p != "" {
		if _, err := os.Stat(p); err != nil {
			return "", fmt.Errorf("%s points to %q which does not exist", envVar, p)
		}
		return p, nil
	}
	p, err := exec.LookPath(name)
	if err != nil {
		return "", fmt.Errorf("not found on PATH")
	}
	return p, nil
}
