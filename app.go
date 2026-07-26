package main

import (
	"context"
	"fmt"
	"log"

	"vid-snatch/internal/binaries"
	"vid-snatch/internal/queue"
	"vid-snatch/internal/settings"
	"vid-snatch/internal/types"
	"vid-snatch/internal/ytdlp"

	"github.com/google/uuid"
	wailsruntime "github.com/wailsapp/wails/v2/pkg/runtime"
)

// App struct
type App struct {
	ctx      context.Context
	bin      binaries.Binaries
	binErr   error
	settings settings.Data
	queue    *queue.Manager
	batches  *queue.BatchManager
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx

	// binErr is deliberately not fatal: crashing here would kill the GUI before
	// the user sees anything. Every yt-dlp-touching method checks binErr first
	// and returns it, so the failure surfaces as a normal error in the UI.
	a.bin, a.binErr = binaries.Resolve()
	if a.binErr != nil {
		log.Println("binaries.Resolve:", a.binErr)
	}

	d, err := settings.Load()
	if err != nil {
		log.Println("settings.Load:", err)
		d = settings.Default()
	}
	a.settings = d

	a.queue = queue.NewManager(a.settings.MaxActiveDownloads)
	a.batches = queue.NewBatchManager()
}

// Greet returns a greeting for the given name
func (a *App) Greet(name string) string {
	return fmt.Sprintf("Hello %s, It's show time!", name)
}

// GetInfo fetches metadata and a filtered format list for the given URL.
func (a *App) GetInfo(url string) (types.MediaInfo, error) {
	if a.binErr != nil {
		return types.MediaInfo{}, a.binErr
	}
	return ytdlp.GetInfo(a.ctx, a.bin, url, a.settings)
}

// GetSettings returns the current user preferences.
func (a *App) GetSettings() settings.Data {
	return a.settings
}

// SaveSettings persists d, adopts it as the current preferences, and applies
// any concurrency change to the running download queue immediately.
func (a *App) SaveSettings(d settings.Data) error {
	if err := settings.Save(d); err != nil {
		return err
	}
	a.settings = d
	a.queue.SetConcurrency(d.MaxActiveDownloads)
	return nil
}

// PickDownloadDir opens a native directory picker. A user-cancelled dialog
// returns ("", nil), which callers should treat as "no change," not an error.
func (a *App) PickDownloadDir() (string, error) {
	return wailsruntime.OpenDirectoryDialog(a.ctx, wailsruntime.OpenDialogOptions{
		Title:                "Choose a download folder",
		DefaultDirectory:     a.settings.DownloadPath,
		CanCreateDirectories: true,
	})
}

// StartDownload builds the yt-dlp argument list for req and submits it to the
// download queue, returning immediately with a download ID the frontend can
// use to subscribe to "download:progress" events before the first one arrives.
func (a *App) StartDownload(req types.DownloadRequest) (string, error) {
	if a.binErr != nil {
		return "", a.binErr
	}
	args, _, err := ytdlp.BuildDownloadArgs(req, a.bin, a.settings)
	if err != nil {
		return "", err
	}

	id := uuid.New().String()
	a.queue.Start(a.ctx, id, func(ctx context.Context) {
		emit := func(p types.Progress) {
			wailsruntime.EventsEmit(a.ctx, "download:progress", p)
		}
		if err := ytdlp.Download(ctx, a.bin, id, args, emit); err != nil {
			wailsruntime.EventsEmit(a.ctx, "download:error", map[string]string{"id": id, "message": err.Error()})
		}
	})
	return id, nil
}

// CancelDownload cancels the in-flight download with the given id, if any.
func (a *App) CancelDownload(id string) error {
	a.queue.Cancel(id)
	return nil
}

// SearchVideos runs a YouTube video search (no playlist results - yt-dlp has
// no playlist-search extractor).
func (a *App) SearchVideos(query string) ([]types.SearchResult, error) {
	if a.binErr != nil {
		return nil, a.binErr
	}
	return ytdlp.SearchVideos(a.ctx, a.bin, query, 20) // fixed limit, no UI knob requested
}

// GetPlaylistEntries lists a playlist's videos via a fast, lightweight
// flat listing (no per-video metadata fetched yet).
func (a *App) GetPlaylistEntries(url string) (types.PlaylistInfo, error) {
	if a.binErr != nil {
		return types.PlaylistInfo{}, a.binErr
	}
	return ytdlp.GetPlaylistEntries(a.ctx, a.bin, url)
}

// StartPlaylistDownload downloads req.Entries strictly one at a time, in the
// given order. Each entry is resolved via the same GetInfo/BuildDownloadArgs/
// Download pipeline as a single ad-hoc download - it just runs sequentially
// via a dedicated BatchManager instead of the concurrent queue.Manager.
func (a *App) StartPlaylistDownload(req types.PlaylistDownloadRequest) (string, error) {
	if a.binErr != nil {
		return "", a.binErr
	}
	if len(req.Entries) == 0 {
		return "", fmt.Errorf("no videos selected")
	}

	batchID := uuid.New().String()
	items := make([]queue.BatchItem, 0, len(req.Entries))
	for _, entry := range req.Entries {
		entry := entry // capture
		items = append(items, queue.BatchItem{
			ID: entry.ID,
			Run: func(ctx context.Context) {
				emit := func(p types.Progress) {
					wailsruntime.EventsEmit(a.ctx, "download:progress", p)
				}
				fail := func(msg string) {
					emit(types.Progress{ID: entry.ID, Stage: "error"})
					wailsruntime.EventsEmit(a.ctx, "download:error", map[string]string{"id": entry.ID, "message": msg})
				}

				info, err := ytdlp.GetInfo(ctx, a.bin, entry.URL, a.settings)
				if err != nil {
					fail(err.Error())
					return
				}

				dreq := types.DownloadRequest{
					URL:            entry.URL,
					Mode:           req.Mode,
					OutputDir:      req.OutputDir,
					Title:          fmt.Sprintf("%s [%s]", info.Title, info.ID),
					ExtractFormat:  req.ExtractFormat,
					ExtractQuality: req.ExtractQuality,
				}
				switch req.Mode {
				case "video":
					if len(info.VideoFormats) == 0 {
						fail("no downloadable video formats")
						return
					}
					dreq.VideoFormatID = info.VideoFormats[0].FormatID // index 0 = best, already sorted
					dreq.VideoExt = info.VideoFormats[0].Ext
					if len(info.AudioFormats) > 0 {
						dreq.AudioFormatID = info.AudioFormats[0].FormatID
						dreq.AudioExt = info.AudioFormats[0].Ext
					}
				case "audio":
					if len(info.AudioFormats) == 0 {
						fail("no downloadable audio formats")
						return
					}
					dreq.AudioFormatID = info.AudioFormats[0].FormatID
					dreq.AudioExt = info.AudioFormats[0].Ext
				case "extract":
					// no FormatID needed - `-x --audio-format` lets yt-dlp pick
					// the source stream itself; GetInfo above was only for Title.
				}

				args, _, err := ytdlp.BuildDownloadArgs(dreq, a.bin, a.settings)
				if err != nil {
					fail(err.Error())
					return
				}
				if err := ytdlp.Download(ctx, a.bin, entry.ID, args, emit); err != nil {
					fail(err.Error())
				}
			},
		})
	}

	a.batches.Start(a.ctx, batchID, items)
	return batchID, nil
}

// CancelPlaylistDownload cancels the currently-downloading item of batchID
// and halts the rest of the sequence from starting.
func (a *App) CancelPlaylistDownload(batchID string) error {
	a.batches.Cancel(batchID)
	return nil
}
