package ytdlp

import (
	"context"
	"os/exec"
	"strings"

	"vid-snatch/internal/binaries"
	"vid-snatch/internal/types"
)

// GetToolVersions reports the resolved binaries' self-reported version
// strings, for display only - never parsed/compared, so a change in either
// tool's version output format can't break anything else here.
func GetToolVersions(ctx context.Context, bin binaries.Binaries) (types.ToolVersions, error) {
	ytdlpOut, err := exec.CommandContext(ctx, bin.YtdlpPath, "--version").Output()
	if err != nil {
		return types.ToolVersions{}, err
	}

	ffmpegOut, err := exec.CommandContext(ctx, bin.FfmpegPath, "-version").Output()
	if err != nil {
		return types.ToolVersions{}, err
	}
	ffmpegFirstLine, _, _ := strings.Cut(string(ffmpegOut), "\n")

	return types.ToolVersions{
		YtdlpVersion:  strings.TrimSpace(string(ytdlpOut)),
		FfmpegVersion: strings.TrimSpace(ffmpegFirstLine),
	}, nil
}
