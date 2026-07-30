package ytdlp

import (
	"fmt"
	"sort"
	"strings"

	"vid-snatch/internal/types"
)

// minHeight is the lowest video height ever offered, mirroring the ported app's
// "running default" floor.
const minHeight = 144

// FormatPrefs are the user preferences that drive filtering.
type FormatPrefs struct {
	PreferredVideoQuality int
	PreferredVideoCodec   string
	ShowMoreFormats       bool
}

// rawFormat mirrors the subset of yt-dlp's -j `formats[]` entries we need.
type rawFormat struct {
	FormatID       string  `json:"format_id"`
	Ext            string  `json:"ext"`
	Height         int     `json:"height"`
	FPS            float64 `json:"fps"`
	VCodec         string  `json:"vcodec"`
	ACodec         string  `json:"acodec"`
	VideoExt       string  `json:"video_ext"`
	AudioExt       string  `json:"audio_ext"`
	ABR            float64 `json:"abr"`
	FormatNote     string  `json:"format_note"`
	Filesize       int64   `json:"filesize"`
	FilesizeApprox int64   `json:"filesize_approx"`
	Resolution     string  `json:"resolution"`
}

// FilterFormats implements the two-pass filtering "intelligence": pick a default
// height + codec, then build typed, labeled video/audio option lists (best first).
func FilterFormats(raw []rawFormat, prefs FormatPrefs) ([]types.VideoFormat, []types.AudioFormat) {
	var videoCands, audioCands []rawFormat
	codecsByHeight := map[int][]string{} // ordered, de-duped vcodec prefixes seen per height

	for _, f := range raw {
		if isVideoCandidate(f, prefs) {
			videoCands = append(videoCands, f)
			if prefix := codecPrefix(f.VCodec); prefix != "" && !containsStr(codecsByHeight[f.Height], prefix) {
				codecsByHeight[f.Height] = append(codecsByHeight[f.Height], prefix)
			}
		}
		if isAudioCandidate(f, prefs) {
			audioCands = append(audioCands, f)
		}
	}

	defaultHeight := 0
	for _, f := range videoCands {
		if f.Height > defaultHeight {
			defaultHeight = f.Height
		}
	}
	selectedCodec := ""
	if codecs := codecsByHeight[defaultHeight]; len(codecs) > 0 {
		selectedCodec = prefs.PreferredVideoCodec
		if !containsStr(codecs, selectedCodec) {
			selectedCodec = codecs[len(codecs)-1] // fallback: last codec available at that height
		}
	}

	// Representative "merged" audio size estimate for progressive-less video rows:
	// the best (highest bitrate) audio candidate.
	var bestAudioSizeMB *float64
	bestABR := -1.0
	for _, f := range audioCands {
		if f.ABR > bestABR {
			bestABR = f.ABR
			bestAudioSizeMB = sizeMB(f)
		}
	}

	videoFormats := make([]types.VideoFormat, 0, len(videoCands))
	for _, f := range videoCands {
		vf := types.VideoFormat{
			FormatID: f.FormatID,
			Ext:      f.VideoExt,
			VCodec:   f.VCodec,
			HasAudio: f.ACodec != "" && f.ACodec != "none",
			SizeMB:   sizeMB(f),
		}
		if f.Height > 0 {
			h := f.Height
			vf.Height = &h
		}
		if f.FPS > 0 {
			fps := f.FPS
			vf.Fps = &fps
		}
		vf.Label = videoLabel(vf, bestAudioSizeMB)
		videoFormats = append(videoFormats, vf)
	}

	audioFormats := make([]types.AudioFormat, 0, len(audioCands)+1)
	for _, f := range audioCands {
		ext := f.AudioExt
		if ext == "" || ext == "none" {
			ext = f.Ext
		}
		if ext == "webm" {
			ext = "opus" // display relabel only - FormatID still selects the real stream
		}
		af := types.AudioFormat{FormatID: f.FormatID, Ext: ext, SizeMB: sizeMB(f)}
		af.Label = audioLabel(af)
		audioFormats = append(audioFormats, af)
	}
	audioFormats = append(audioFormats, types.AudioFormat{FormatID: "none", Ext: "none", Label: "No Audio"})

	// Best quality first: by height desc, preferred/fallback codec first within a height.
	sort.SliceStable(videoFormats, func(i, j int) bool {
		hi, hj := heightOf(videoFormats[i]), heightOf(videoFormats[j])
		if hi != hj {
			return hi > hj
		}
		if selectedCodec == "" {
			return false
		}
		pi := strings.HasPrefix(videoFormats[i].VCodec, selectedCodec)
		pj := strings.HasPrefix(videoFormats[j].VCodec, selectedCodec)
		return pi && !pj
	})

	return videoFormats, audioFormats
}

func isVideoCandidate(f rawFormat, prefs FormatPrefs) bool {
	if f.VideoExt == "" || f.VideoExt == "none" {
		return false
	}
	if f.Height < minHeight || f.Height > prefs.PreferredVideoQuality {
		return false
	}
	if f.VideoExt == "mp4" && strings.HasPrefix(f.VCodec, "vp09") {
		return false
	}
	if !prefs.ShowMoreFormats && f.VideoExt == "webm" {
		return false
	}
	return true
}

func isAudioCandidate(f rawFormat, prefs FormatPrefs) bool {
	isAudio := (f.AudioExt != "" && f.AudioExt != "none") ||
		(f.ACodec != "" && f.ACodec != "none" && (f.VideoExt == "" || f.VideoExt == "none"))
	if !isAudio {
		return false
	}
	ext := f.AudioExt
	if ext == "" || ext == "none" {
		ext = f.Ext
	}
	if ext == "webm" && !prefs.ShowMoreFormats {
		return false
	}
	return true
}

// codecPrefix extracts the codec family from a vcodec string, e.g.
// "avc1.640028" -> "avc1", "vp09.00.10.08" -> "vp09".
func codecPrefix(vcodec string) string {
	if vcodec == "" || vcodec == "none" {
		return ""
	}
	if i := strings.Index(vcodec, "."); i > 0 {
		return vcodec[:i]
	}
	return vcodec
}

func containsStr(list []string, s string) bool {
	for _, v := range list {
		if v == s {
			return true
		}
	}
	return false
}

func sizeMB(f rawFormat) *float64 {
	b := f.Filesize
	if b == 0 {
		b = f.FilesizeApprox
	}
	if b == 0 {
		return nil
	}
	mb := float64(b) / 1_000_000
	mb = float64(int(mb*100)) / 100
	return &mb
}

func heightOf(vf types.VideoFormat) int {
	if vf.Height == nil {
		return 0
	}
	return *vf.Height
}

func videoLabel(vf types.VideoFormat, mergedAudioMB *float64) string {
	height := "?"
	if vf.Height != nil {
		height = fmt.Sprintf("%dp", *vf.Height)
	}
	label := fmt.Sprintf("%s (%s, %s)", height, vf.VCodec, vf.Ext)
	if vf.HasAudio {
		label += " · progressive"
	}
	switch {
	case vf.SizeMB == nil:
		label += " — Unknown size"
	case !vf.HasAudio && mergedAudioMB != nil:
		label += fmt.Sprintf(" — %.2f MB (+ ~%.2f MB audio)", *vf.SizeMB, *mergedAudioMB)
	default:
		label += fmt.Sprintf(" — %.2f MB", *vf.SizeMB)
	}
	return label
}

func audioLabel(af types.AudioFormat) string {
	label := strings.ToUpper(af.Ext)
	if af.SizeMB != nil {
		label += fmt.Sprintf(" — %.2f MB", *af.SizeMB)
	} else {
		label += " — Unknown size"
	}
	return label
}
