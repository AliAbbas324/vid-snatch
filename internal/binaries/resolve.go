// Package binaries resolves the yt-dlp and ffmpeg executables this app shells out to,
// and (see install.go) can download portable copies for users who don't have them.
package binaries

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
)

// Binaries holds the resolved absolute paths to the external tools we depend on.
type Binaries struct {
	YtdlpPath  string
	FfmpegPath string
}

// Resolve finds yt-dlp and ffmpeg via VIDSNATCH_YTDLP_PATH/VIDSNATCH_FFMPEG_PATH
// env var overrides, falling back to PATH, then to the managed copies Install
// downloads into InstallDir(). It returns a combined error naming exactly which
// binaries are missing and how to fix it; on error the returned Binaries is
// always the zero value.
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
	if p, err := exec.LookPath(name); err == nil {
		return p, nil
	}
	// Not on PATH - check the managed directory Install downloads into, so a
	// prior auto-install (or a manually dropped-in copy) is picked up without
	// needing to be on PATH.
	if dir, err := InstallDir(); err == nil {
		p := filepath.Join(dir, managedName(name))
		if st, statErr := os.Stat(p); statErr == nil && !st.IsDir() {
			return p, nil
		}
	}
	return "", fmt.Errorf("not found on PATH")
}

// Missing reports which of yt-dlp/ffmpeg Resolve currently can't find.
// Resolve itself collapses "one found, one missing" into a single opaque
// all-or-nothing error, which is fine for ytdlp-touching call sites but not
// enough for the dependency-status/install UI, which needs to know
// specifically which tool(s) still need fixing.
func Missing() (ytdlpMissing, ffmpegMissing bool) {
	_, ytdlpErr := resolveOne("yt-dlp", "VIDSNATCH_YTDLP_PATH")
	_, ffmpegErr := resolveOne("ffmpeg", "VIDSNATCH_FFMPEG_PATH")
	return ytdlpErr != nil, ffmpegErr != nil
}

// managedName returns the filename Install saves name as inside InstallDir().
func managedName(name string) string {
	if runtime.GOOS == "windows" {
		return name + ".exe"
	}
	return name
}
