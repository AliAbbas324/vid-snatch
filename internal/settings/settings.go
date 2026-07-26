// Package settings persists user preferences to ~/.vid-snatch/settings.json.
package settings

import (
	"encoding/json"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

// Data is the full set of user-configurable preferences.
type Data struct {
	PreferredVideoQuality int    `json:"preferredVideoQuality"`
	PreferredAudioQuality string `json:"preferredAudioQuality"`
	PreferredVideoCodec   string `json:"preferredVideoCodec"`
	ShowMoreFormats       bool   `json:"showMoreFormats"`
	DownloadPath          string `json:"downloadPath"`
	Browser               string `json:"browser"`
	Proxy                 string `json:"proxy"`
	ConfigPath            string `json:"configPath"`
	MaxActiveDownloads    int    `json:"maxActiveDownloads"`
}

// Default returns the built-in defaults, mirroring the ported ytDownloader app.
func Default() Data {
	return Data{
		PreferredVideoQuality: 720,
		PreferredVideoCodec:   "avc1",
		MaxActiveDownloads:    5,
		DownloadPath:          defaultDownloadDir(),
	}
}

func settingsDir() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(home, ".vid-snatch"), nil
}

func settingsPath() (string, error) {
	dir, err := settingsDir()
	if err != nil {
		return "", err
	}
	return filepath.Join(dir, "settings.json"), nil
}

// Load reads settings.json, creating it with defaults if absent. If the stored
// DownloadPath is no longer writable, it falls back to the OS Downloads dir and
// persists that correction immediately.
func Load() (Data, error) {
	path, err := settingsPath()
	if err != nil {
		return Data{}, err
	}

	raw, err := os.ReadFile(path)
	if os.IsNotExist(err) {
		d := Default()
		if err := Save(d); err != nil {
			return Data{}, err
		}
		return d, nil
	}
	if err != nil {
		return Data{}, err
	}

	d := Default()
	if err := json.Unmarshal(raw, &d); err != nil {
		return Data{}, err
	}

	if !isWritableDir(d.DownloadPath) {
		d.DownloadPath = defaultDownloadDir()
		if err := Save(d); err != nil {
			return Data{}, err
		}
	}

	return d, nil
}

// Save writes d to settings.json, creating ~/.vid-snatch if needed.
func Save(d Data) error {
	dir, err := settingsDir()
	if err != nil {
		return err
	}
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return err
	}
	path, err := settingsPath()
	if err != nil {
		return err
	}
	raw, err := json.MarshalIndent(d, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(path, raw, 0o644)
}

// defaultDownloadDir resolves the OS Downloads directory, honoring
// `xdg-user-dir DOWNLOAD` on Linux and falling back to ~/Downloads elsewhere.
func defaultDownloadDir() string {
	home, err := os.UserHomeDir()
	if err != nil {
		home = "."
	}
	fallback := filepath.Join(home, "Downloads")

	if out, err := exec.Command("xdg-user-dir", "DOWNLOAD").Output(); err == nil {
		if dir := strings.TrimSpace(string(out)); dir != "" && dir != home {
			return dir
		}
	}
	return fallback
}

// isWritableDir reports whether path exists, is a directory, and is writable.
func isWritableDir(path string) bool {
	if path == "" {
		return false
	}
	info, err := os.Stat(path)
	if err != nil || !info.IsDir() {
		return false
	}
	probe := filepath.Join(path, ".vid-snatch-write-test")
	f, err := os.Create(probe)
	if err != nil {
		return false
	}
	f.Close()
	os.Remove(probe)
	return true
}
