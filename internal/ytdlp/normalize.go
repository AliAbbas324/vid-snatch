package ytdlp

import "strings"

// NormalizeURL rewrites known extractor-compat host aliases (e.g. x.com -> twitter.com)
// so yt-dlp's extractor matches reliably.
func NormalizeURL(url string) string {
	return strings.Replace(url, "//x.com/", "//twitter.com/", 1)
}
