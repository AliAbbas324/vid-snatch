// Command build produces vid-snatch's versioned production installers.
// Run it the same way on every OS, from the repo root:
//
//	go run ./cmd/build
//
// It reads VERSION, builds the app with that version injected via ldflags,
// then packages an installer appropriate to runtime.GOOS:
//
//	linux:   build/bin/vid-snatch-<version>-x86_64.AppImage
//	         build/bin/vid-snatch_<version>_amd64.deb
//	windows: build/bin/vid-snatch-amd64-installer.exe (via NSIS)
//	darwin:  build/bin/vid-snatch.app (plain bundle - no .dmg packaging yet)
//
// This exists as a Go program rather than a shell script specifically so
// there's exactly one place the build logic lives - Go is the one toolchain
// every one of these platforms already needs to build the app at all, so
// there's no shell (bash vs PowerShell) to pick between.
package main

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
)

func main() {
	if err := build(); err != nil {
		fmt.Fprintln(os.Stderr, "build failed:", err)
		os.Exit(1)
	}
}

func build() error {
	repoRoot, err := repoRootDir()
	if err != nil {
		return fmt.Errorf("locating repo root: %w", err)
	}
	if err := os.Chdir(repoRoot); err != nil {
		return err
	}

	version, err := readVersion()
	if err != nil {
		return fmt.Errorf("reading VERSION: %w", err)
	}

	fmt.Printf("Building vid-snatch v%s for %s/%s...\n", version, runtime.GOOS, runtime.GOARCH)

	args := []string{"build", "-tags", "webkit2_41", "-clean", "-ldflags", "-X main.appVersion=" + version}
	if runtime.GOOS == "windows" {
		// Produces build/bin/vid-snatch-amd64-installer.exe via NSIS, in
		// addition to the raw .exe. Requires makensis on PATH - if it's
		// missing, wails build already prints a clear message and just
		// skips this step rather than failing outright.
		args = append(args, "-nsis")
	}
	if err := run("wails", args...); err != nil {
		return fmt.Errorf("wails build: %w", err)
	}

	switch runtime.GOOS {
	case "linux":
		if err := buildAppImage(version); err != nil {
			return fmt.Errorf("AppImage: %w", err)
		}
		if err := buildDeb(version); err != nil {
			return fmt.Errorf(".deb: %w", err)
		}
	case "windows":
		fmt.Println("Built build/bin/vid-snatch.exe and build/bin/vid-snatch-amd64-installer.exe (if NSIS was found)")
	case "darwin":
		fmt.Println("Built build/bin/vid-snatch.app (no .dmg packaging configured yet)")
	default:
		fmt.Printf("Note: no installer packaging configured for %s - just the raw binary was built.\n", runtime.GOOS)
	}
	return nil
}

// repoRootDir resolves the repo root from this source file's own location
// (cmd/build/main.go), so `go run ./cmd/build` works regardless of the
// caller's current directory.
func repoRootDir() (string, error) {
	_, thisFile, _, ok := runtime.Caller(0)
	if !ok {
		return "", fmt.Errorf("could not determine source location")
	}
	return filepath.Dir(filepath.Dir(filepath.Dir(thisFile))), nil
}

func readVersion() (string, error) {
	b, err := os.ReadFile("VERSION")
	if err != nil {
		return "", err
	}
	return strings.TrimSpace(string(b)), nil
}

func run(name string, args ...string) error {
	cmd := exec.Command(name, args...)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.Stdin = os.Stdin
	return cmd.Run()
}

// --- Linux packaging ---------------------------------------------------

// buildAppImage assembles a throwaway AppDir from the just-built binary,
// build/linux/vid-snatch.desktop, and build/appicon.png, then packages it
// with appimagetool (auto-downloaded to a per-user cache dir if it isn't
// already on PATH). The closest Linux equivalent of the Windows NSIS
// installer; still depends on the target system having gtk3/webkit2gtk-4.1
// installed - it bundles only the executable, icon, and desktop entry.
func buildAppImage(version string) error {
	appimagetool, err := ensureAppImageTool()
	if err != nil {
		return err
	}

	appDir := filepath.Join("build", "bin", "vid-snatch.AppDir")
	if err := os.RemoveAll(appDir); err != nil {
		return err
	}
	if err := os.MkdirAll(filepath.Join(appDir, "usr", "bin"), 0o755); err != nil {
		return err
	}
	if err := copyFile(filepath.Join("build", "bin", "vid-snatch"), filepath.Join(appDir, "usr", "bin", "vid-snatch"), 0o755); err != nil {
		return err
	}
	if err := copyFile(filepath.Join("build", "linux", "vid-snatch.desktop"), filepath.Join(appDir, "vid-snatch.desktop"), 0o644); err != nil {
		return err
	}
	if err := copyFile(filepath.Join("build", "appicon.png"), filepath.Join(appDir, "vid-snatch.png"), 0o644); err != nil {
		return err
	}
	if err := os.Symlink("usr/bin/vid-snatch", filepath.Join(appDir, "AppRun")); err != nil {
		return err
	}

	out := filepath.Join("build", "bin", fmt.Sprintf("vid-snatch-%s-x86_64.AppImage", version))
	fmt.Println("Packaging AppImage...")
	if err := run(appimagetool, appDir, out); err != nil {
		return err
	}
	if err := os.RemoveAll(appDir); err != nil {
		return err
	}
	fmt.Println("Built", out)
	return nil
}

func ensureAppImageTool() (string, error) {
	if p, err := exec.LookPath("appimagetool"); err == nil {
		return p, nil
	}
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	cacheDir := filepath.Join(home, ".cache", "vid-snatch-build")
	path := filepath.Join(cacheDir, "appimagetool-x86_64.AppImage")
	if _, err := os.Stat(path); err == nil {
		return path, nil
	}

	fmt.Println("appimagetool not found - downloading a cached copy to", path, "...")
	if err := os.MkdirAll(cacheDir, 0o755); err != nil {
		return "", err
	}
	const url = "https://github.com/AppImage/appimagetool/releases/download/continuous/appimagetool-x86_64.AppImage"
	if err := downloadFile(url, path); err != nil {
		return "", err
	}
	if err := os.Chmod(path, 0o755); err != nil {
		return "", err
	}
	return path, nil
}

// buildDeb assembles a standard usr/bin + usr/share/applications +
// usr/share/icons/hicolor package root and builds it with dpkg-deb.
// DEBIAN/control is templated from build/linux/control (__VERSION__
// substituted here); Depends covers both older and post-time_t64-transition
// Debian/Ubuntu gtk3 package names.
func buildDeb(version string) error {
	debRoot := filepath.Join("build", "bin", "vid-snatch-deb")
	if err := os.RemoveAll(debRoot); err != nil {
		return err
	}
	dirs := []string{
		filepath.Join(debRoot, "DEBIAN"),
		filepath.Join(debRoot, "usr", "bin"),
		filepath.Join(debRoot, "usr", "share", "applications"),
		filepath.Join(debRoot, "usr", "share", "icons", "hicolor", "1024x1024", "apps"),
	}
	for _, d := range dirs {
		if err := os.MkdirAll(d, 0o755); err != nil {
			return err
		}
	}
	if err := copyFile(filepath.Join("build", "bin", "vid-snatch"), filepath.Join(debRoot, "usr", "bin", "vid-snatch"), 0o755); err != nil {
		return err
	}
	if err := copyFile(filepath.Join("build", "linux", "vid-snatch.desktop"), filepath.Join(debRoot, "usr", "share", "applications", "vid-snatch.desktop"), 0o644); err != nil {
		return err
	}
	iconDest := filepath.Join(debRoot, "usr", "share", "icons", "hicolor", "1024x1024", "apps", "vid-snatch.png")
	if err := copyFile(filepath.Join("build", "appicon.png"), iconDest, 0o644); err != nil {
		return err
	}

	control, err := os.ReadFile(filepath.Join("build", "linux", "control"))
	if err != nil {
		return err
	}
	rendered := strings.ReplaceAll(string(control), "__VERSION__", version)
	if err := os.WriteFile(filepath.Join(debRoot, "DEBIAN", "control"), []byte(rendered), 0o644); err != nil {
		return err
	}

	out := filepath.Join("build", "bin", fmt.Sprintf("vid-snatch_%s_amd64.deb", version))
	fmt.Println("Packaging .deb...")
	if err := run("dpkg-deb", "--build", "--root-owner-group", debRoot, out); err != nil {
		return err
	}
	if err := os.RemoveAll(debRoot); err != nil {
		return err
	}
	fmt.Println("Built", out)
	return nil
}

// --- shared helpers ------------------------------------------------------

func copyFile(src, dst string, mode os.FileMode) error {
	data, err := os.ReadFile(src)
	if err != nil {
		return err
	}
	return os.WriteFile(dst, data, mode)
}

func downloadFile(url, dest string) error {
	resp, err := http.Get(url)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("download failed: HTTP %d", resp.StatusCode)
	}
	out, err := os.Create(dest)
	if err != nil {
		return err
	}
	defer out.Close()
	_, err = io.Copy(out, resp.Body)
	return err
}
