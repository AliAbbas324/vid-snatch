package binaries

import (
	"archive/tar"
	"archive/zip"
	"bytes"
	"os"
	"path/filepath"
	"testing"

	"github.com/ulikunitz/xz"
)

// Both fixtures mimic yt-dlp/FFmpeg-Builds' real layout: a versioned root
// directory (name changes with every build) containing bin/ffmpeg[.exe]
// alongside files (ffprobe, presets/) this app never asks for - which is
// exactly why extraction matches by basename instead of a hardcoded path.

func TestExtractFromTarXz(t *testing.T) {
	dir := t.TempDir()
	archivePath := filepath.Join(dir, "fake.tar.xz")
	writeTarXzFixture(t, archivePath, "ffmpeg-master-latest-linux64-gpl", "ffmpeg")

	dest := filepath.Join(dir, "ffmpeg")
	if err := extractFromTarXz(archivePath, "ffmpeg", dest); err != nil {
		t.Fatal(err)
	}
	assertFileContent(t, dest, "the ffmpeg binary")
}

func TestExtractFromTarXz_NotFound(t *testing.T) {
	dir := t.TempDir()
	archivePath := filepath.Join(dir, "fake.tar.xz")
	writeTarXzFixture(t, archivePath, "ffmpeg-master-latest-linux64-gpl", "ffmpeg")

	if err := extractFromTarXz(archivePath, "ffplay", filepath.Join(dir, "out")); err == nil {
		t.Fatal("expected an error for a name absent from the archive")
	}
}

func TestExtractFromZip(t *testing.T) {
	dir := t.TempDir()
	archivePath := filepath.Join(dir, "fake.zip")
	writeZipFixture(t, archivePath, "ffmpeg-master-latest-win64-gpl", "ffmpeg.exe")

	dest := filepath.Join(dir, "ffmpeg.exe")
	if err := extractFromZip(archivePath, "ffmpeg.exe", dest); err != nil {
		t.Fatal(err)
	}
	assertFileContent(t, dest, "the ffmpeg binary")
}

func writeTarXzFixture(t *testing.T, path, rootDir, binName string) {
	t.Helper()
	var raw bytes.Buffer
	tw := tar.NewWriter(&raw)
	addTarFile(t, tw, rootDir+"/bin/"+binName, "the ffmpeg binary")
	addTarFile(t, tw, rootDir+"/bin/ffprobe", "the ffprobe binary")
	addTarFile(t, tw, rootDir+"/presets/libvpx-720p.ffpreset", "preset data")
	if err := tw.Close(); err != nil {
		t.Fatal(err)
	}

	f, err := os.Create(path)
	if err != nil {
		t.Fatal(err)
	}
	defer f.Close()
	xw, err := xz.NewWriter(f)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := xw.Write(raw.Bytes()); err != nil {
		t.Fatal(err)
	}
	if err := xw.Close(); err != nil {
		t.Fatal(err)
	}
}

func addTarFile(t *testing.T, tw *tar.Writer, name, content string) {
	t.Helper()
	if err := tw.WriteHeader(&tar.Header{Name: name, Mode: 0o755, Size: int64(len(content))}); err != nil {
		t.Fatal(err)
	}
	if _, err := tw.Write([]byte(content)); err != nil {
		t.Fatal(err)
	}
}

func writeZipFixture(t *testing.T, path, rootDir, binName string) {
	t.Helper()
	f, err := os.Create(path)
	if err != nil {
		t.Fatal(err)
	}
	defer f.Close()

	zw := zip.NewWriter(f)
	addZipFile(t, zw, rootDir+"/bin/"+binName, "the ffmpeg binary")
	addZipFile(t, zw, rootDir+"/bin/ffprobe.exe", "the ffprobe binary")
	if err := zw.Close(); err != nil {
		t.Fatal(err)
	}
}

func addZipFile(t *testing.T, zw *zip.Writer, name, content string) {
	t.Helper()
	w, err := zw.Create(name)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := w.Write([]byte(content)); err != nil {
		t.Fatal(err)
	}
}

func assertFileContent(t *testing.T, path, want string) {
	t.Helper()
	got, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	if string(got) != want {
		t.Fatalf("extracted content = %q, want %q", got, want)
	}
}
