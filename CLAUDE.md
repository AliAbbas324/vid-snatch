# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Vid Snatch is a desktop video/audio downloader built on Wails v2: a Go backend (shells out to `yt-dlp` and `ffmpeg`) paired with a React + TypeScript + Tailwind v4 frontend, packaged as a native window. The Go side owns all yt-dlp/ffmpeg interaction, download concurrency, and settings persistence; the frontend is a thin, mostly-presentational client that calls Go methods through Wails' generated bindings and listens for progress over Wails events.

## Commands

**Run in dev mode** (hot-reloading frontend, live Go rebinding):
```
wails dev -tags webkit2_41
```
The `-tags webkit2_41` build tag is required on this machine's WebKitGTK version - pass it to both `wails dev` and `wails build` (it's already set as `build:tags` in `wails.json` for `wails build`, but pass it explicitly for `wails dev` too).

**Build a versioned production installer** (same command on every OS):
```
go run ./cmd/build
```
`cmd/build/main.go` is a small Go program, not a shell script - bash and PowerShell are different runtimes, but Go is already a hard prerequisite for building this app on any platform, so there's no shell to pick between. It reads `VERSION`, passes it to the Go binary via `-ldflags "-X main.appVersion=..."` (so `App.GetAppVersion()`, shown in Settings' About card, reports the real release version instead of `main.go`'s `"dev"` default), and then packages an installer per `runtime.GOOS`:
- **linux**: `build/bin/vid-snatch-<version>-x86_64.AppImage` (via `appimagetool`, auto-downloaded to `~/.cache/vid-snatch-build/` if not on `PATH` - same auto-fetch-what's-missing philosophy as the app's own yt-dlp/ffmpeg install) and `build/bin/vid-snatch_<version>_amd64.deb` (via `dpkg-deb`, `DEBIAN/control` templated from `build/linux/control` with `__VERSION__` substituted, `Depends` covering both older and post-time_t64-transition Debian/Ubuntu gtk3 package names). Neither bundles gtk3/webkit2gtk-4.1 - both still need it present on the target system.
- **windows**: `build/bin/vid-snatch-amd64-installer.exe` via NSIS (passes `-nsis` to `wails build`; requires `makensis` on `PATH` on that machine - Wails has no built-in `.msi` generator, only NSIS's `.exe`; an `.msi` would need a separate WiX Toolset setup this project doesn't have)
- **darwin**: just the plain `.app` bundle `wails build` already produces - no `.dmg` packaging configured

Bump `VERSION` and `wails.json`'s `info.productVersion` together when cutting a release - the latter isn't read at build time, it's baked into the OS-level file metadata (Windows exe properties / macOS `Info.plist`) by `wails build` itself.

GTK windows don't get a taskbar/alt-tab icon for free the way Windows/macOS do (those come from the exe resource / `Info.plist` bundling `wails build` already handles) - `main.go` sets `options.App.Linux.Icon` (embedded from `build/appicon.png` via `go:embed`) and `Linux.ProgramName` explicitly, matching `build/linux/vid-snatch.desktop`'s `Exec=`/`Icon=` so the window manager's icon lookup actually resolves once installed.

`build/appicon.png` (and `build/appicon.svg`, its vector source) mirror `frontend/src/components/Logo.tsx`'s in-app brand mark, with its CSS custom-property colors baked in as literal hex - see `build/appicon.svg`'s header comment before editing either. `wails build` only regenerates `build/windows/icon.ico`/macOS's `.icns` from `appicon.png` if that platform's icon file doesn't already exist yet (`packager.go`'s `generateIcoFile`/`processDarwinIcon` both skip existing files rather than overwriting) - and since that step only runs when actually targeting `windows`/`darwin`, it never fires from a Linux build at all. So after changing `appicon.png`, regenerate `icon.ico` by hand (delete it and cross-build for Windows, or just re-export from the PNG directly, e.g. via Pillow's multi-res ICO support) rather than assuming `go run ./cmd/build` will pick it up on Linux.

**Backend (Go), from repo root:**
- `go build ./...` - compile check
- `go vet ./...` - static checks
- `go test ./...` - run all tests
- `go test ./internal/ytdlp/... -run TestBuildDownloadArgs_ContainerFallback` - run a single test
- Tests live in `internal/queue` and `internal/ytdlp`; `internal/binaries`, `internal/settings`, `internal/types`, and `app.go` have no tests.

**Frontend, from `frontend/`:**
- `pnpm install` - install deps (pnpm is required; `wails.json` calls `pnpm install`/`pnpm build` directly)
- `pnpm dev` - Vite dev server alone (normally driven by `wails dev`, not run standalone)
- `pnpm build` - runs `tsc` then `vite build`; this is the closest thing to a lint/typecheck step (there is no ESLint config)
- No frontend test runner is configured.

**Bound-method regeneration:** if you change a Go method's signature on `App` (`app.go`) or a struct in `internal/types`, `wails dev`/`wails build` regenerates `frontend/wailsjs/` automatically - don't hand-edit that directory.

## Architecture

### Process boundary
`app.go` defines `App`, the single struct bound to the frontend (`Bind: []interface{}{app}` in `main.go`). Every method on `App` becomes a callable JS function in `frontend/wailsjs/go/main/App.js` (regenerated, not hand-written). The frontend never talks to yt-dlp directly - everything routes through `App`'s methods, wrapped one-for-one in `frontend/src/api/*.ts`.

Long-running work (downloads) can't return a value synchronously, so it follows a different pattern: `StartDownload`/`StartPlaylistDownload` return an ID immediately, and progress streams back later via `wailsruntime.EventsEmit(ctx, "download:progress", ...)` / `"download:error"`. The frontend's `useDownloadProgress` hook (`frontend/src/events/useDownloadProgress.ts`) is the single `EventsOn` subscriber for both events and fans updates out by matching `payload.id` against locally-registered rows - it does not poll Go for status.

### Download concurrency model (`internal/queue`)
Two independent mechanisms exist because ad-hoc downloads and playlist batches have different ordering requirements:
- **`Manager` + `Pool`** (`manager.go`, `pool.go`): a semaphore-bounded worker pool for ad-hoc downloads (`StartDownload`). Concurrency is resizable at runtime (`SetConcurrency`, wired to the `MaxActiveDownloads` setting) without disturbing in-flight jobs. `Manager` also tracks a `context.CancelFunc` per download ID so `CancelDownload` can stop one job without affecting others.
- **`BatchManager` + `Batch`** (`batch.go`): playlist downloads run strictly one-at-a-time in a single goroutine, deliberately bypassing the pool - order matters and only one item runs per batch. Independent batches are NOT serialized against each other. A panic in one item is recovered and the batch continues with the next item.

### yt-dlp integration (`internal/ytdlp`)
All shelling-out to yt-dlp lives here. Key split: `GetInfo` (single video, full format list) vs. the flat-playlist path (`flatlist.go`) used by both playlist listing and search (`ytsearchN:query` is passed as the "playlist" URL - yt-dlp has no dedicated search extractor, confirmed via `yt-dlp --list-extractors`). `args.go` builds the actual yt-dlp CLI argument list from a `types.DownloadRequest`; `formats.go` filters/labels the raw format list yt-dlp reports into what the UI shows; `progress.go` parses yt-dlp's stdout lines into `Progress` events, including detecting stage transitions (downloading → processing → done) from plain-text lines yt-dlp prints around merging/postprocessing.

### Binaries and settings
`internal/binaries.Resolve()` locates `yt-dlp`/`ffmpeg` via `VIDSNATCH_YTDLP_PATH`/`VIDSNATCH_FFMPEG_PATH` env vars first, then `PATH`, then the managed `~/.vid-snatch/bin/` directory `Install` downloads into. Resolution happens once at startup (`app.startup`); failure is stored on `App.binErr` rather than crashing the app, so every yt-dlp-touching method checks it and returns it as a normal error instead of the GUI dying before the user sees anything.

For users without either tool installed, `internal/binaries/install.go`'s `Install` downloads portable copies: yt-dlp's own GitHub release asset directly, and ffmpeg from `yt-dlp/FFmpeg-Builds` (a static-build project maintained specifically for bundling into yt-dlp GUI wrappers like this one) - the ffmpeg archives are extracted in-memory (`archive/zip` for Windows, `archive/tar` + `github.com/ulikunitz/xz` for Linux's `.tar.xz`) matching by basename rather than a hardcoded path, since the archive's root folder name changes with every build. macOS has no auto-installable ffmpeg build (`ManualFfmpegHint` returns `brew install ffmpeg` instead). `App.CheckDependencies`/`InstallDependencies` expose this to the frontend; `InstallDependencies` streams progress on the `"setup:progress"` event, the same fire-and-return-immediately-then-events pattern downloads use. The frontend's `DependencySetup` component (rendered unconditionally in `App.tsx`, self-contained like `AboutCard`) checks on mount and auto-runs the install with a progress banner if anything's missing - renders nothing when both tools are already found, so it adds no friction for anyone who already has them on `PATH`.

`internal/settings` persists `~/.vid-snatch/settings.json` (`Load`/`Save`/`Default`). `App.settings` is loaded once at startup and mutated in place by `SaveSettings`, which also immediately applies `MaxActiveDownloads` to the live `queue.Manager`.

### Frontend structure
`App.tsx` is the sole orchestrator: it owns all cross-cutting state (active view, theme, output dir/settings, the omnibox's mode/value, which video/playlist inspector is open, download rows) and passes it down as props - there is no router or global store. The UI shell is Rail (fixed-width icon nav) + TopBar (persistent link/search/playlist omnibox, present on every view) + a view body that switches between `DiscoverView`, `DownloadsView`, and `SettingsView`. `Inspector` and `PlaylistInspector` are slide-in panels (not modals) for configuring and starting a download.

`frontend/src/types/index.ts` re-exports Wails-generated types (`wailsjs/go/models`) as the app's type vocabulary, plus hand-mirrored event-only payloads - `Progress`/`DownloadRow` and `SetupProgress` never appear in a bound method signature (they're only ever emitted on `"download:progress"`/`"setup:progress"`), so Wails never generates TS for them, and each must be kept in sync with its Go counterpart (`internal/types.Progress`/`SetupProgress`) by hand.

### Theming
Colors are runtime-swappable CSS custom properties, not Tailwind's build-time `dark:` variant. `style.css`'s `@theme` block registers `--color-*` tokens (dark palette, the default); `:root[data-theme="light"]`/`:root[data-theme="dark"]` blocks and a `prefers-color-scheme` media query override the same variable names for the other modes. Every component just uses semantic utilities (`bg-surface`, `text-ink-muted`, ...) and repaints correctly across themes with zero `dark:` prefixes anywhere. `frontend/index.html` applies the stored theme via an inline script before first paint to avoid a flash; `theme/useTheme.ts` takes over from there and persists the choice (`auto`/`light`/`dark`) to `localStorage`.

DownloadsView's list is a CSS grid (not a `<table>`): the header row and every data row share one `GRID_COLS` template string, which is what keeps columns aligned regardless of row content - the responsive variant swaps in a 4-column template below the `md` breakpoint (hiding the Speed/ETA cell) rather than just hiding a `<td>`, since a grid item's visibility and the grid's column count have to change together or alignment breaks.
