package ytdlp

import "testing"

func defaultPrefs() FormatPrefs {
	return FormatPrefs{PreferredVideoQuality: 720, PreferredVideoCodec: "avc1", ShowMoreFormats: false}
}

func TestFilterFormats_ExcludesVP09InMP4(t *testing.T) {
	raw := []rawFormat{
		{FormatID: "1", Height: 720, VideoExt: "mp4", VCodec: "vp09.00.10.08", ACodec: "none"},
		{FormatID: "2", Height: 720, VideoExt: "mp4", VCodec: "avc1.640028", ACodec: "none"},
	}
	video, _ := FilterFormats(raw, defaultPrefs())

	for _, f := range video {
		if f.FormatID == "1" {
			t.Fatalf("expected vp09-in-mp4 format to be excluded, got %+v", f)
		}
	}
	if len(video) != 1 || video[0].FormatID != "2" {
		t.Fatalf("expected only the avc1 format to survive, got %+v", video)
	}
}

func TestFilterFormats_CodecFallsBackToLastAvailableAtDefaultHeight(t *testing.T) {
	// Preferred codec "avc1" is absent at the default (highest allowed) height;
	// only vp9 and av01 are available there. The doc rule: fall back to the
	// LAST codec available at that height, i.e. av01, and that codec should
	// sort first among same-height formats.
	raw := []rawFormat{
		{FormatID: "vp9-720", Height: 720, VideoExt: "mp4", VCodec: "vp09.00.10.08", ACodec: "none"},
		{FormatID: "av01-720", Height: 720, VideoExt: "mp4", VCodec: "av01.0.05M.08", ACodec: "none"},
		{FormatID: "avc1-480", Height: 480, VideoExt: "mp4", VCodec: "avc1.4d401e", ACodec: "none"},
	}
	// vp09-in-mp4 is excluded by rule, so at height 720 only av01 remains -
	// use a webm container instead so vp9 survives the vp09/mp4-only exclusion,
	// giving two real candidates at the default height to fall back between.
	raw[0].VideoExt = "webm"
	prefs := defaultPrefs()
	prefs.ShowMoreFormats = true // allow webm through so both 720p candidates are in play

	video, _ := FilterFormats(raw, prefs)
	if len(video) == 0 {
		t.Fatal("expected at least one video format")
	}
	if got := heightOf(video[0]); got != 720 {
		t.Fatalf("expected best format to be at the default height 720, got %d", got)
	}
	if video[0].FormatID != "av01-720" {
		t.Fatalf("expected fallback-to-last-codec (av01) to sort first at the default height, got %+v", video[0])
	}
}

func TestFilterFormats_WebmAudioRelabeledAndSkippedByDefault(t *testing.T) {
	raw := []rawFormat{
		{FormatID: "opus-1", VideoExt: "none", AudioExt: "webm", ACodec: "opus", ABR: 128},
		{FormatID: "m4a-1", VideoExt: "none", AudioExt: "m4a", ACodec: "aac", ABR: 128},
	}

	_, audioDefault := FilterFormats(raw, defaultPrefs())
	for _, f := range audioDefault {
		if f.FormatID == "opus-1" {
			t.Fatalf("expected webm audio to be skipped when ShowMoreFormats=false, got %+v", f)
		}
	}

	prefsMore := defaultPrefs()
	prefsMore.ShowMoreFormats = true
	_, audioMore := FilterFormats(raw, prefsMore)
	found := false
	for _, f := range audioMore {
		if f.FormatID == "opus-1" {
			found = true
			if f.Ext != "opus" {
				t.Fatalf("expected webm audio to be relabeled to opus, got ext=%q", f.Ext)
			}
		}
	}
	if !found {
		t.Fatal("expected webm audio format to be present when ShowMoreFormats=true")
	}
}

func TestFilterFormats_IncludesSyntheticNoAudioEntry(t *testing.T) {
	raw := []rawFormat{
		{FormatID: "m4a-1", VideoExt: "none", AudioExt: "m4a", ACodec: "aac", ABR: 128},
	}
	_, audio := FilterFormats(raw, defaultPrefs())

	found := false
	for _, f := range audio {
		if f.FormatID == "none" && f.Ext == "none" && f.Label == "No Audio" {
			found = true
		}
	}
	if !found {
		t.Fatalf("expected a synthetic {none,none,\"No Audio\"} entry, got %+v", audio)
	}
	if audio[len(audio)-1].FormatID != "none" {
		t.Fatalf("expected the No Audio entry to be last, got %+v", audio)
	}
}
