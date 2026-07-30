package ytdlp

import "testing"

func TestNormalizeURL(t *testing.T) {
	cases := map[string]string{
		"https://x.com/user/status/1":       "https://twitter.com/user/status/1",
		"https://twitter.com/user/status/1": "https://twitter.com/user/status/1",
		"https://youtube.com/watch?v=abc":   "https://youtube.com/watch?v=abc",
	}
	for in, want := range cases {
		if got := NormalizeURL(in); got != want {
			t.Errorf("NormalizeURL(%q) = %q, want %q", in, got, want)
		}
	}
}
