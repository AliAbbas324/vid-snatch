package main

import (
	"embed"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/linux"
)

//go:embed all:frontend/dist
var assets embed.FS

// Windows/macOS get their icon baked in at build time (the exe resource /
// Info.plist bundling wails build already does from build/windows/icon.ico
// and build/darwin's icon), but GTK windows on Linux don't - the window/
// taskbar icon has to be set here at runtime, or there simply isn't one.
//
//go:embed build/appicon.png
var icon []byte

// appVersion is "dev" for `wails dev`/plain `go build`, and gets overwritten
// with the real release version at production-build time via
// `-ldflags "-X main.appVersion=$(cat VERSION)"` (see build.sh). Keep it in
// sync with VERSION and wails.json's info.productVersion when bumping.
var appVersion = "dev"

func main() {
	// Create an instance of the app structure
	app := NewApp()

	// Create application with options
	err := wails.Run(&options.App{
		Title:     "vid-snatch",
		Width:     1024,
		Height:    768,
		MinWidth:  1024,
		MinHeight: 768,
		AssetServer: &assetserver.Options{
			Assets: assets,
		},
		// Matches the dark theme's base surface - the common case, since
		// most OSes default to dark or the user hasn't chosen light yet -
		// so the native window paints close to the eventual page instead of
		// flashing white before the webview content takes over.
		BackgroundColour: &options.RGBA{R: 26, G: 26, B: 28, A: 1},
		OnStartup:        app.startup,
		Bind: []interface{}{
			app,
		},
		Linux: &linux.Options{
			Icon: icon,
			// Matches build/linux/vid-snatch.desktop's Exec= line, so the
			// window manager's WM_CLASS lookup resolves back to that
			// .desktop file's icon once the app is actually installed
			// (from the .deb, or a copied-in AppImage) rather than just
			// whatever this binary happened to be invoked as.
			ProgramName: "vid-snatch",
		},
	})

	if err != nil {
		println("Error:", err.Error())
	}
}
