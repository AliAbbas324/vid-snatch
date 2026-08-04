package binaries

import (
	"archive/tar"
	"archive/zip"
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"runtime"

	"github.com/ulikunitz/xz"
)

// yt-dlp ships prebuilt binaries directly on its GitHub releases; ffmpeg comes
// from yt-dlp's own FFmpeg-Builds project, which exists specifically to give
// yt-dlp GUI wrappers like this one a static build to bundle. Both URLs point
// at a rolling "latest" release, so there's nothing to keep in sync by hand.
const (
	ytdlpReleaseBase  = "https://github.com/yt-dlp/yt-dlp/releases/latest/download/"
	ffmpegReleaseBase = "https://github.com/yt-dlp/FFmpeg-Builds/releases/download/latest/"
)

// asset names yt-dlp/ffmpeg to download for the running OS/arch. ffmpegAsset
// is "" where no auto-installable static build exists (macOS - see
// ManualFfmpegHint) even though yt-dlp itself is still installable there.
type assetSet struct {
	ytdlpAsset  string
	ffmpegAsset string
	// ffmpegIsArchive is true when ffmpegAsset needs extracting (zip/tar.xz)
	// rather than being the executable itself, as yt-dlp's asset always is.
	ffmpegIsArchive bool
}

func assetsForPlatform() (assetSet, bool) {
	switch runtime.GOOS {
	case "linux":
		switch runtime.GOARCH {
		case "amd64":
			return assetSet{"yt-dlp_linux", "ffmpeg-master-latest-linux64-gpl.tar.xz", true}, true
		case "arm64":
			return assetSet{"yt-dlp_linux_aarch64", "ffmpeg-master-latest-linuxarm64-gpl.tar.xz", true}, true
		}
	case "windows":
		switch runtime.GOARCH {
		case "amd64":
			return assetSet{"yt-dlp.exe", "ffmpeg-master-latest-win64-gpl.zip", true}, true
		case "arm64":
			return assetSet{"yt-dlp_arm64.exe", "ffmpeg-master-latest-winarm64-gpl.zip", true}, true
		case "386":
			return assetSet{"yt-dlp_x86.exe", "ffmpeg-master-latest-win32-gpl.zip", true}, true
		}
	case "darwin":
		// yt-dlp publishes a universal (intel+arm) mac binary, but its
		// FFmpeg-Builds project doesn't build for macOS at all - there's no
		// single static build we can pull reliably, so ffmpeg stays manual
		// there (see ManualFfmpegHint).
		return assetSet{ytdlpAsset: "yt-dlp_macos"}, true
	}
	return assetSet{}, false
}

// Installable reports whether Install can attempt an automatic download of
// at least yt-dlp on this OS/architecture.
func Installable() bool {
	_, ok := assetsForPlatform()
	return ok
}

// ManualFfmpegHint returns non-empty when this platform can't auto-install
// ffmpeg (currently just macOS), with the command a user should run instead.
func ManualFfmpegHint() string {
	if runtime.GOOS == "darwin" {
		return "brew install ffmpeg"
	}
	return ""
}

// InstallDir is where Install saves the binaries it downloads, and where
// Resolve looks for them as a last resort. It intentionally mirrors
// settings.settingsDir()'s ~/.vid-snatch root without importing that package.
func InstallDir() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(home, ".vid-snatch", "bin"), nil
}

// Progress is reported periodically during Install.
type Progress struct {
	Tool    string // "yt-dlp" | "ffmpeg"
	Stage   string // "downloading" | "extracting"
	Percent int    // 0-100; -1 if the server didn't report a content length
}

// Install downloads whichever of yt-dlp/ffmpeg Resolve() currently can't
// find into InstallDir(), reporting progress via onProgress (which may be
// called from a goroutine and must not block). Tools that already resolve
// are left untouched - calling Install when everything's already present is
// a fast no-op. Returns an error describing anything it couldn't install;
// callers should re-run Resolve() afterwards regardless, since partial
// success (e.g. yt-dlp installed, ffmpeg failed) is possible.
func Install(ctx context.Context, onProgress func(Progress)) error {
	assets, ok := assetsForPlatform()
	if !ok {
		return fmt.Errorf("automatic install isn't supported on %s/%s", runtime.GOOS, runtime.GOARCH)
	}

	dir, err := InstallDir()
	if err != nil {
		return err
	}
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return fmt.Errorf("creating %s: %w", dir, err)
	}

	if onProgress == nil {
		onProgress = func(Progress) {}
	}

	var errs []error

	if _, err := resolveOne("yt-dlp", "VIDSNATCH_YTDLP_PATH"); err != nil {
		dest := filepath.Join(dir, managedName("yt-dlp"))
		if err := downloadFile(ctx, ytdlpReleaseBase+assets.ytdlpAsset, dest, "yt-dlp", onProgress); err != nil {
			errs = append(errs, fmt.Errorf("yt-dlp: %w", err))
		} else if err := makeExecutable(dest); err != nil {
			errs = append(errs, fmt.Errorf("yt-dlp: %w", err))
		}
	}

	if _, err := resolveOne("ffmpeg", "VIDSNATCH_FFMPEG_PATH"); err != nil {
		switch {
		case assets.ffmpegAsset == "":
			if hint := ManualFfmpegHint(); hint != "" {
				errs = append(errs, fmt.Errorf("ffmpeg: no automatic build for this platform - run %q", hint))
			} else {
				errs = append(errs, errors.New("ffmpeg: no automatic build for this platform"))
			}
		case assets.ffmpegIsArchive:
			if err := installFfmpegArchive(ctx, ffmpegReleaseBase+assets.ffmpegAsset, dir, onProgress); err != nil {
				errs = append(errs, fmt.Errorf("ffmpeg: %w", err))
			}
		default:
			dest := filepath.Join(dir, managedName("ffmpeg"))
			if err := downloadFile(ctx, ffmpegReleaseBase+assets.ffmpegAsset, dest, "ffmpeg", onProgress); err != nil {
				errs = append(errs, fmt.Errorf("ffmpeg: %w", err))
			} else if err := makeExecutable(dest); err != nil {
				errs = append(errs, fmt.Errorf("ffmpeg: %w", err))
			}
		}
	}

	return errors.Join(errs...)
}

// downloadFile streams url to dest, reporting percent-complete via
// onProgress. It writes to a temp file in the same directory first and
// renames into place at the end, so a failed/cancelled download never leaves
// a half-written file where Resolve would find it.
func downloadFile(ctx context.Context, url, dest, tool string, onProgress func(Progress)) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return err
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("download failed: HTTP %d", resp.StatusCode)
	}

	tmp, err := os.CreateTemp(filepath.Dir(dest), ".download-*")
	if err != nil {
		return err
	}
	tmpPath := tmp.Name()
	defer os.Remove(tmpPath) // no-op once the rename below succeeds

	pr := &progressReader{r: resp.Body, total: resp.ContentLength, tool: tool, stage: "downloading", onProgress: onProgress}
	_, copyErr := io.Copy(tmp, pr)
	closeErr := tmp.Close()
	if copyErr != nil {
		return copyErr
	}
	if closeErr != nil {
		return closeErr
	}
	return os.Rename(tmpPath, dest)
}

// installFfmpegArchive downloads a yt-dlp/FFmpeg-Builds zip or tar.xz to a
// temp file, pulls just the ffmpeg[.exe] binary out of its bin/ directory,
// and discards the rest (the archives also carry ffprobe/ffplay and
// presets/docs this app never uses).
func installFfmpegArchive(ctx context.Context, url, dir string, onProgress func(Progress)) error {
	tmp, err := os.CreateTemp(dir, ".ffmpeg-archive-*")
	if err != nil {
		return err
	}
	tmpPath := tmp.Name()
	defer os.Remove(tmpPath)

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		tmp.Close()
		return err
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		tmp.Close()
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		tmp.Close()
		return fmt.Errorf("download failed: HTTP %d", resp.StatusCode)
	}

	pr := &progressReader{r: resp.Body, total: resp.ContentLength, tool: "ffmpeg", stage: "downloading", onProgress: onProgress}
	if _, err := io.Copy(tmp, pr); err != nil {
		tmp.Close()
		return err
	}
	if err := tmp.Close(); err != nil {
		return err
	}

	onProgress(Progress{Tool: "ffmpeg", Stage: "extracting", Percent: -1})

	dest := filepath.Join(dir, managedName("ffmpeg"))
	wantName := managedName("ffmpeg")
	var extractErr error
	if filepath.Ext(url) == ".zip" {
		extractErr = extractFromZip(tmpPath, wantName, dest)
	} else {
		extractErr = extractFromTarXz(tmpPath, wantName, dest)
	}
	if extractErr != nil {
		return extractErr
	}
	return makeExecutable(dest)
}

// extractFromZip and extractFromTarXz both look for an entry whose base name
// matches wantName (ignoring which directory it's nested in) rather than a
// hardcoded full path, since the archive's top-level folder name changes with
// every ffmpeg build ("ffmpeg-master-latest-linux64-gpl", etc.).
func extractFromZip(archivePath, wantName, dest string) error {
	zr, err := zip.OpenReader(archivePath)
	if err != nil {
		return err
	}
	defer zr.Close()

	for _, f := range zr.File {
		if filepath.Base(f.Name) != wantName {
			continue
		}
		rc, err := f.Open()
		if err != nil {
			return err
		}
		defer rc.Close()
		return writeExtracted(rc, dest)
	}
	return fmt.Errorf("%s not found in archive", wantName)
}

func extractFromTarXz(archivePath, wantName, dest string) error {
	f, err := os.Open(archivePath)
	if err != nil {
		return err
	}
	defer f.Close()

	xr, err := xz.NewReader(f)
	if err != nil {
		return err
	}
	tr := tar.NewReader(xr)
	for {
		hdr, err := tr.Next()
		if err == io.EOF {
			return fmt.Errorf("%s not found in archive", wantName)
		}
		if err != nil {
			return err
		}
		if hdr.Typeflag != tar.TypeReg || filepath.Base(hdr.Name) != wantName {
			continue
		}
		return writeExtracted(tr, dest)
	}
}

func writeExtracted(r io.Reader, dest string) error {
	tmp, err := os.CreateTemp(filepath.Dir(dest), ".extract-*")
	if err != nil {
		return err
	}
	tmpPath := tmp.Name()
	defer os.Remove(tmpPath)

	if _, err := io.Copy(tmp, r); err != nil {
		tmp.Close()
		return err
	}
	if err := tmp.Close(); err != nil {
		return err
	}
	return os.Rename(tmpPath, dest)
}

func makeExecutable(path string) error {
	if runtime.GOOS == "windows" {
		return nil
	}
	return os.Chmod(path, 0o755)
}

// progressReader wraps an io.Reader, calling onProgress as bytes flow through.
type progressReader struct {
	r          io.Reader
	total      int64
	read       int64
	tool       string
	stage      string
	onProgress func(Progress)
	lastPct    int
}

func (p *progressReader) Read(buf []byte) (int, error) {
	n, err := p.r.Read(buf)
	p.read += int64(n)
	pct := -1
	if p.total > 0 {
		pct = int(p.read * 100 / p.total)
	}
	// Only fire on whole-percent changes (or the first read) so this doesn't
	// flood the frontend with an event per network chunk.
	if pct != p.lastPct || p.read == int64(n) {
		p.lastPct = pct
		p.onProgress(Progress{Tool: p.tool, Stage: p.stage, Percent: pct})
	}
	return n, err
}
