// Package types holds wire structs shared between internal/ytdlp, internal/settings,
// and app.go. Kept separate so ytdlp doesn't need to import settings (or vice versa).
package types

// VideoFormat is a single selectable video stream, already filtered/labeled.
type VideoFormat struct {
	FormatID string   `json:"formatId"`
	Ext      string   `json:"ext"`
	Height   *int     `json:"height,omitempty"`
	Fps      *float64 `json:"fps,omitempty"`
	VCodec   string   `json:"vcodec"`
	HasAudio bool     `json:"hasAudio"`
	SizeMB   *float64 `json:"sizeMb,omitempty"`
	Label    string   `json:"label"`
}

// AudioFormat is a single selectable audio stream, already filtered/labeled.
type AudioFormat struct {
	FormatID string   `json:"formatId"`
	Ext      string   `json:"ext"`
	SizeMB   *float64 `json:"sizeMb,omitempty"`
	Label    string   `json:"label"`
}

// MediaInfo is the result of a GetInfo call.
type MediaInfo struct {
	ID           string        `json:"id"`
	Title        string        `json:"title"`
	Thumbnail    string        `json:"thumbnail"`
	DurationSec  float64       `json:"durationSec"`
	ExtractorKey string        `json:"extractorKey"`
	VideoFormats []VideoFormat `json:"videoFormats"`
	AudioFormats []AudioFormat `json:"audioFormats"`
	// SubtitleLanguages lists the manually-authored subtitle language codes
	// yt-dlp reports as available (auto-generated captions are excluded - on
	// most videos every language has an auto-caption, which would make this
	// list meaningless for picking "real" subs).
	SubtitleLanguages []string `json:"subtitleLanguages"`
}

// DownloadRequest is what the frontend sends to StartDownload.
type DownloadRequest struct {
	URL            string `json:"url"`
	Mode           string `json:"mode"` // "video" | "audio" | "extract"
	VideoFormatID  string `json:"videoFormatId,omitempty"`
	AudioFormatID  string `json:"audioFormatId,omitempty"` // "none" sentinel = no audio track
	ExtractFormat  string `json:"extractFormat,omitempty"` // mp3|m4a|opus|wav|alac|flac|vorbis
	ExtractQuality string `json:"extractQuality,omitempty"`
	OutputDir      string `json:"outputDir"`
	Title          string `json:"title"`
	// Thumbnail is carried through purely so the Go side can record it into
	// download history - GetInfo already ran on the frontend before this
	// request is built, so there's no reason to re-fetch it server-side.
	Thumbnail  string `json:"thumbnail,omitempty"`
	RangeStart string `json:"rangeStart,omitempty"`
	RangeEnd   string `json:"rangeEnd,omitempty"`
	WriteSubs  bool   `json:"writeSubs,omitempty"`
	// SubLangs is a comma-joined list of subtitle language codes; empty means "all".
	SubLangs string `json:"subLangs,omitempty"`
	// VideoExt/AudioExt echo the .Ext of the selected VideoFormat/AudioFormat
	// (as returned by GetInfo) back to StartDownload, since the container-fallback
	// rule needs both container extensions and the request only carries format IDs.
	VideoExt string `json:"videoExt,omitempty"`
	AudioExt string `json:"audioExt,omitempty"`
}

// ToolVersions reports the resolved yt-dlp/ffmpeg binaries' self-reported versions.
type ToolVersions struct {
	YtdlpVersion  string `json:"ytdlpVersion"`
	FfmpegVersion string `json:"ffmpegVersion"`
}

// Progress is emitted on the "download:progress" event.
type Progress struct {
	ID      string  `json:"id"`
	Percent float64 `json:"percent"`
	Speed   string  `json:"speed"`
	ETA     string  `json:"eta"`
	Stage   string  `json:"stage"` // "downloading" | "processing" | "done" | "error" | "cancelled"
}

// SearchResult is one video hit from a YouTube search (video-only - yt-dlp has
// no playlist-search extractor).
type SearchResult struct {
	ID          string  `json:"id"`
	Title       string  `json:"title"`
	URL         string  `json:"url"`
	DurationSec float64 `json:"durationSec"`
	Thumbnail   string  `json:"thumbnail"`
	Channel     string  `json:"channel"`
}

// PlaylistEntry is one video row from a flat-playlist listing of a playlist URL.
type PlaylistEntry struct {
	ID          string  `json:"id"`
	Title       string  `json:"title"`
	URL         string  `json:"url"`
	DurationSec float64 `json:"durationSec"`
	Thumbnail   string  `json:"thumbnail"`
	Index       int     `json:"index"` // yt-dlp's playlist_index, 1-based
}

// PlaylistInfo is the result of a GetPlaylistEntries call.
type PlaylistInfo struct {
	Title    string          `json:"title"`
	Uploader string          `json:"uploader"`
	Entries  []PlaylistEntry `json:"entries"`
}

// PlaylistDownloadEntry pins one selected video's ID+URL so StartPlaylistDownload
// never has to reconstruct a YouTube-specific "watch?v=" URL from a bare ID.
type PlaylistDownloadEntry struct {
	ID  string `json:"id"`
	URL string `json:"url"`
	// Thumbnail is carried through purely for download-history recording -
	// mirrors DownloadRequest.Thumbnail for the same reason.
	Thumbnail string `json:"thumbnail,omitempty"`
}

// PlaylistDownloadRequest is what the frontend sends to StartPlaylistDownload.
// Entries is ordered - this is the exact download sequence. Deliberately has no
// RangeStart/RangeEnd/WriteSubs: per-clip range trimming doesn't generalize
// across a whole playlist of differently-timed videos; that stays on the
// existing single-video DownloadRequest path.
type PlaylistDownloadRequest struct {
	PlaylistURL    string                  `json:"playlistUrl"`
	Entries        []PlaylistDownloadEntry `json:"entries"`
	Mode           string                  `json:"mode"` // "video" | "audio" | "extract"
	ExtractFormat  string                  `json:"extractFormat,omitempty"`
	ExtractQuality string                  `json:"extractQuality,omitempty"`
	OutputDir      string                  `json:"outputDir"`
}
