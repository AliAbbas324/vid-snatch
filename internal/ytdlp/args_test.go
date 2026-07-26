package ytdlp

import (
	"strings"
	"testing"

	"vid-snatch/internal/binaries"
	"vid-snatch/internal/settings"
	"vid-snatch/internal/types"
)

func testBin() binaries.Binaries {
	return binaries.Binaries{YtdlpPath: "yt-dlp", FfmpegPath: "/usr/bin/ffmpeg"}
}

func testSettings() settings.Data {
	return settings.Default()
}

func TestBuildDownloadArgs_ContainerFallback(t *testing.T) {
	cases := []struct {
		name       string
		videoExt   string
		audioExt   string
		wantOutExt string
	}{
		{"mp4+opus falls back to mkv", "mp4", "opus", "mkv"},
		{"webm+m4a falls back to mkv", "webm", "m4a", "mkv"},
		{"webm+mp4 falls back to mkv", "webm", "mp4", "mkv"},
		{"mp4+m4a stays mp4", "mp4", "m4a", "mp4"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			req := types.DownloadRequest{
				URL: "https://example.com/watch?v=x", Mode: "video",
				VideoFormatID: "137", AudioFormatID: "140",
				VideoExt: tc.videoExt, AudioExt: tc.audioExt,
				OutputDir: "/tmp", Title: "Some Title",
			}
			args, outExt, err := BuildDownloadArgs(req, testBin(), testSettings())
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if outExt != tc.wantOutExt {
				t.Fatalf("outExt = %q, want %q", outExt, tc.wantOutExt)
			}
			if !containsArg(args, "-f", "137+140") {
				t.Fatalf("expected -f 137+140 in args, got %v", args)
			}
		})
	}
}

func TestBuildDownloadArgs_VideoNoAudioUsesVideoFormatAlone(t *testing.T) {
	req := types.DownloadRequest{
		URL: "https://example.com", Mode: "video",
		VideoFormatID: "137", AudioFormatID: "none", VideoExt: "mp4",
		OutputDir: "/tmp", Title: "T",
	}
	args, outExt, err := BuildDownloadArgs(req, testBin(), testSettings())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if outExt != "mp4" {
		t.Fatalf("outExt = %q, want mp4", outExt)
	}
	if !containsArg(args, "-f", "137") {
		t.Fatalf("expected -f 137 (no merge) in args, got %v", args)
	}
}

func TestBuildDownloadArgs_RangeVariants(t *testing.T) {
	cases := []struct {
		start, end, want string
	}{
		{"10", "", "*10-inf"},
		{"", "20", "*0-20"},
		{"10", "20", "*10-20"},
		{"", "", ""},
	}
	for _, tc := range cases {
		req := types.DownloadRequest{
			URL: "https://example.com", Mode: "audio", AudioFormatID: "140", AudioExt: "m4a",
			OutputDir: "/tmp", Title: "T", RangeStart: tc.start, RangeEnd: tc.end,
		}
		args, _, err := BuildDownloadArgs(req, testBin(), testSettings())
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if tc.want == "" {
			if containsFlag(args, "--download-sections") {
				t.Fatalf("expected no --download-sections for empty range, got %v", args)
			}
			continue
		}
		if !containsArg(args, "--download-sections", tc.want) {
			t.Fatalf("start=%q end=%q: expected --download-sections %q, got %v", tc.start, tc.end, tc.want, args)
		}
	}
}

func TestBuildDownloadArgs_ExtractModeThumbnailGating(t *testing.T) {
	mp3 := types.DownloadRequest{URL: "https://example.com", Mode: "extract", ExtractFormat: "mp3", OutputDir: "/tmp", Title: "T"}
	args, outExt, err := BuildDownloadArgs(mp3, testBin(), testSettings())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if outExt != "mp3" {
		t.Fatalf("outExt = %q, want mp3", outExt)
	}
	if !containsFlag(args, "--embed-thumbnail") {
		t.Fatalf("expected --embed-thumbnail for mp3 extract on non-macOS, got %v", args)
	}

	wav := types.DownloadRequest{URL: "https://example.com", Mode: "extract", ExtractFormat: "wav", OutputDir: "/tmp", Title: "T"}
	args, _, err = BuildDownloadArgs(wav, testBin(), testSettings())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if containsFlag(args, "--embed-thumbnail") {
		t.Fatalf("expected no --embed-thumbnail for wav extract, got %v", args)
	}
}

func TestBuildDownloadArgs_TitleSanitization(t *testing.T) {
	req := types.DownloadRequest{
		URL: "https://example.com", Mode: "audio", AudioFormatID: "140", AudioExt: "m4a",
		OutputDir: "/tmp", Title: `weird/na:me*?"<>|`,
	}
	args, _, err := BuildDownloadArgs(req, testBin(), testSettings())
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	out := argAfter(args, "-o")
	if !strings.Contains(out, "weird_na_me") {
		t.Fatalf("expected sanitized title in -o path, got %q", out)
	}
}

func containsArg(args []string, flag, value string) bool {
	for i := 0; i < len(args)-1; i++ {
		if args[i] == flag && args[i+1] == value {
			return true
		}
	}
	return false
}

func containsFlag(args []string, flag string) bool {
	for _, a := range args {
		if a == flag {
			return true
		}
	}
	return false
}

func argAfter(args []string, flag string) string {
	for i := 0; i < len(args)-1; i++ {
		if args[i] == flag {
			return args[i+1]
		}
	}
	return ""
}
