# 🎬 Vid Snatch

A fast, no-nonsense desktop app for grabbing video and audio off the web. Paste a link, search YouTube, or drop a whole playlist — pick your format, hit download, done. 🚀

Built with [Wails v2](https://wails.io) 🐹 (Go backend) + ⚛️ React/TypeScript + 🎨 Tailwind v4, powered by `yt-dlp` and `ffmpeg` under the hood.

## ✨ Features

- 🔗 **Paste a link** — drop any video URL and go straight to format picking
- 🔍 **Search YouTube** — no need to leave the app to find what you want
- 📋 **Playlist batches** — load a whole playlist, pick which videos you want, reorder them, and queue them all in one go
- 🎞️ **Video, 🎧 Audio, or 🎵 Extract** — full video, audio-only, or extract straight to mp3/m4a/opus/wav/flac and friends
- ✂️ **Trim ranges** and 💬 **subtitle** downloads
- 📊 **Live progress** — real-time speed/ETA per download, with cancel and retry
- 🌗 **Light / Dark / Auto** theme, matched to your system
- ⌨️ **Command palette** (`⌘K` / `Ctrl+K`) for keyboard-first navigation
- 🪟 Fully resizable window — the UI holds up all the way down to a mini window

## 🧰 Prerequisites

- [Go](https://go.dev/) 1.23+
- [Node.js](https://nodejs.org/) + [pnpm](https://pnpm.io/)
- [Wails CLI](https://wails.io/docs/gettingstarted/installation) v2
- [`yt-dlp`](https://github.com/yt-dlp/yt-dlp) and [`ffmpeg`](https://ffmpeg.org/) available on your `PATH` (or point `VIDSNATCH_YTDLP_PATH` / `VIDSNATCH_FFMPEG_PATH` at them)

## 🏃 Getting started

Run it in live dev mode — hot-reloading frontend, instant Go rebinds:

```bash
wails dev -tags webkit2_41
```

> ℹ️ The `-tags webkit2_41` flag is needed on Linux setups running a newer WebKitGTK. Drop it if your system doesn't need it.

Want to poke at the Go bindings straight from browser devtools? Open `http://localhost:34115` while `wails dev` is running.

## 📦 Building

Package it up into a redistributable production binary:

```bash
wails build
```

## 🛠️ Tech stack

| Layer | Tech |
|---|---|
| Desktop shell | Wails v2 |
| Backend | Go — queues, settings, yt-dlp/ffmpeg orchestration |
| Frontend | React + TypeScript |
| Styling | Tailwind CSS v4 (runtime-swappable theme tokens) |
| Icons | Phosphor Icons |

## 📂 Project layout

```
app.go               # Go methods bound to the frontend
internal/
  ├─ binaries/        # locates yt-dlp / ffmpeg
  ├─ queue/            # download concurrency + playlist batch sequencing
  ├─ settings/          # persisted user preferences
  └─ ytdlp/             # yt-dlp process wrapper, arg building, progress parsing
frontend/
  └─ src/
      ├─ components/    # Rail, TopBar, Discover/Downloads/Settings views, inspectors
      ├─ api/            # thin wrappers around Wails-generated bindings
      ├─ events/          # download progress event subscription
      └─ theme/            # light/dark/auto theme handling
```

For a deeper architecture breakdown, see [`CLAUDE.md`](./CLAUDE.md). 🗺️

## ⚙️ Configuring

Project-level Wails settings (name, build tags, output filename, etc.) live in `wails.json` — see the [project config reference](https://wails.io/docs/reference/project-config) for the full list of options.

## 📄 License

MIT — see [`LICENSE`](./LICENSE). Fork it, use it, send a PR. 🎉
