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
	RangeStart     string `json:"rangeStart,omitempty"`
	RangeEnd       string `json:"rangeEnd,omitempty"`
	WriteSubs      bool   `json:"writeSubs,omitempty"`
}

// Progress is emitted on the "download:progress" event.
type Progress struct {
	ID      string  `json:"id"`
	Percent float64 `json:"percent"`
	Speed   string  `json:"speed"`
	ETA     string  `json:"eta"`
	Stage   string  `json:"stage"` // "downloading" | "processing" | "done" | "error"
}
