package ytdlp

import "testing"

func TestParseLine(t *testing.T) {
	p, ok := ParseLine("d1", "PROGRESS 45.2% 1.2MiB/s 00:12")
	if !ok {
		t.Fatal("expected a progress line to parse")
	}
	if p.ID != "d1" || p.Percent != 45.2 || p.Speed != "1.2MiB/s" || p.ETA != "00:12" || p.Stage != "downloading" {
		t.Fatalf("unexpected parse result: %+v", p)
	}

	if _, ok := ParseLine("d1", "[youtube] Extracting URL"); ok {
		t.Fatal("expected unrelated stdout noise to not parse as progress")
	}
}

func TestDetectStage(t *testing.T) {
	if stage, ok := DetectStage(`[Merger] Merging formats into "video.mkv"`); !ok || stage != "processing" {
		t.Fatalf("expected [Merger] line to report stage=processing, got %q ok=%v", stage, ok)
	}
	if stage, ok := DetectStage(`[ExtractAudio] Destination: audio.mp3`); !ok || stage != "processing" {
		t.Fatalf("expected [ExtractAudio] line to report stage=processing, got %q ok=%v", stage, ok)
	}
	if _, ok := DetectStage("PROGRESS 10.0% 500KiB/s 00:30"); ok {
		t.Fatal("expected a progress line to not also be detected as a stage line")
	}
}
