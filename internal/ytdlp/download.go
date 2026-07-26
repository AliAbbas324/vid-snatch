package ytdlp

import (
	"bufio"
	"bytes"
	"context"
	"fmt"
	"os/exec"
	"strings"

	"vid-snatch/internal/binaries"
	"vid-snatch/internal/types"
)

// progressArgs are prepended to every download invocation so stdout is
// line-buffered and machine-parseable by ParseLine/DetectStage.
var progressArgs = []string{
	"--newline",
	"--progress-template", "download:PROGRESS %(progress._percent_str)s %(progress._speed_str)s %(progress._eta_str)s",
}

// EmitFunc delivers a progress update to the caller (wired to
// runtime.EventsEmit by app.go).
type EmitFunc func(types.Progress)

// Download runs yt-dlp with args (built by BuildDownloadArgs), streaming
// progress via emit until the process exits or ctx is cancelled.
//
// Cancellation (ctx.Err() != nil) is reported via emit as stage "cancelled"
// and returns a nil error - it's a user action, not a failure. Any other
// non-zero exit is reported as stage "error" and returns yt-dlp's stderr text
// as the error, since *exec.Cmd doesn't surface stderr on its own.
func Download(ctx context.Context, bin binaries.Binaries, id string, args []string, emit EmitFunc) error {
	fullArgs := append(append([]string{}, progressArgs...), args...)
	cmd := exec.CommandContext(ctx, bin.YtdlpPath, fullArgs...)

	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return err
	}
	var stderrBuf bytes.Buffer
	cmd.Stderr = &stderrBuf

	if err := cmd.Start(); err != nil {
		return err
	}

	sc := bufio.NewScanner(stdout)
	sc.Buffer(make([]byte, 0, 64*1024), 1024*1024)
	for sc.Scan() {
		line := sc.Text()
		if p, ok := ParseLine(id, line); ok {
			emit(p)
			continue
		}
		if stage, ok := DetectStage(line); ok {
			emit(types.Progress{ID: id, Stage: stage})
		}
	}

	waitErr := cmd.Wait()
	if ctx.Err() != nil {
		emit(types.Progress{ID: id, Stage: "cancelled"})
		return nil
	}
	if waitErr != nil {
		emit(types.Progress{ID: id, Stage: "error"})
		if msg := strings.TrimSpace(stderrBuf.String()); msg != "" {
			return fmt.Errorf("%s", msg)
		}
		return waitErr
	}

	emit(types.Progress{ID: id, Percent: 100, Stage: "done"})
	return nil
}
