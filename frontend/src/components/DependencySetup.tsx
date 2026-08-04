import { useEffect, useState } from "react";
import { CheckCircle, CircleNotch, WarningCircle, X } from "@phosphor-icons/react";
import { EventsOn } from "../../wailsjs/runtime/runtime";
import { checkDependencies, installDependencies } from "../api/system";
import type { DependencyStatus, SetupProgress } from "../types";

type Phase = "idle" | "installing" | "done" | "error" | "manual";
type ToolState = { stage: SetupProgress["stage"]; percent: number };

const TOOLS = ["yt-dlp", "ffmpeg"] as const;

/**
 * Auto-installs yt-dlp/ffmpeg into ~/.vid-snatch/bin the first time either is
 * missing, showing a progress banner while it happens. Self-contained (own
 * fetch+state) rather than lifted into App.tsx, same as AboutCard in
 * SettingsView - nothing else in the app needs this status.
 *
 * Renders nothing once nothing's missing (the common case for anyone who
 * already has yt-dlp/ffmpeg on PATH) - this never adds friction for them.
 */
export function DependencySetup() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState<Partial<Record<(typeof TOOLS)[number], ToolState>>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const off = EventsOn("setup:progress", (p: SetupProgress) => {
      setProgress((prev) => ({ ...prev, [p.tool]: { stage: p.stage, percent: p.percent } }));
    });
    return off;
  }, []);

  useEffect(() => {
    checkDependencies().then((s) => {
      if (!s.ytdlpMissing && !s.ffmpegMissing) return; // already set up - stay idle, render nothing
      if (s.canAutoInstall) runInstall();
      else setPhase("manual");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // "done" is a brief confirmation, not a permanent state - fade back to idle
  // (unmounting the banner) once the user's had a moment to see it.
  useEffect(() => {
    if (phase !== "done") return;
    const t = setTimeout(() => setPhase("idle"), 2600);
    return () => clearTimeout(t);
  }, [phase]);

  function describeFailure(s: DependencyStatus): string {
    if (s.ffmpegMissing && s.manualFfmpegHint) {
      return `ffmpeg has no automatic build for this platform - run "${s.manualFfmpegHint}" yourself, then retry.`;
    }
    return "Check your internet connection, or set VIDSNATCH_YTDLP_PATH/VIDSNATCH_FFMPEG_PATH to point at an existing install.";
  }

  function runInstall() {
    setPhase("installing");
    setError(null);
    installDependencies()
      .catch((err) => setError(String(err)))
      .then(() => checkDependencies())
      .then((s) => {
        if (!s.ytdlpMissing && !s.ffmpegMissing) {
          setPhase("done");
        } else {
          setError((prev) => prev ?? describeFailure(s));
          setPhase("error");
        }
      });
  }

  if (phase === "idle") return null;

  return (
    <div
      className={`flex shrink-0 flex-wrap items-center gap-4 border-b px-5 py-3 md:px-8 ${
        phase === "error" || phase === "manual" ? "border-danger-wash bg-danger-wash" : "border-border bg-surface-2"
      }`}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        {phase === "installing" && <CircleNotch size={17} weight="bold" className="shrink-0 animate-spin text-accent" />}
        {phase === "done" && <CheckCircle size={17} weight="fill" className="shrink-0 text-success" />}
        {(phase === "error" || phase === "manual") && <WarningCircle size={17} weight="fill" className="shrink-0 text-danger" />}
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-ink">
            {phase === "installing" && "Setting up yt-dlp and ffmpeg…"}
            {phase === "done" && "yt-dlp and ffmpeg are ready"}
            {phase === "error" && "Couldn't finish setting up yt-dlp/ffmpeg"}
            {phase === "manual" && "yt-dlp/ffmpeg need a manual install on this platform"}
          </div>
          {(phase === "error" || phase === "manual") && (
            <div className="mt-0.5 truncate text-sm text-ink-muted">
              {error ?? "Set VIDSNATCH_YTDLP_PATH/VIDSNATCH_FFMPEG_PATH to an existing install, or install them yourself."}
            </div>
          )}
        </div>
      </div>

      {phase === "installing" && (
        <div className="flex shrink-0 gap-4">
          {TOOLS.map((tool) => {
            const p = progress[tool];
            if (!p) return null;
            return (
              <div key={tool} className="w-32">
                <div className="flex justify-between font-mono text-xs text-ink-muted">
                  <span>{tool}</span>
                  <span>{p.stage === "extracting" ? "extracting" : p.percent >= 0 ? `${p.percent}%` : "…"}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-3">
                  <div
                    className="h-full rounded-full bg-accent transition-[width] duration-300"
                    style={{ width: `${p.stage === "extracting" ? 100 : Math.max(0, p.percent)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {phase === "error" && (
        <button
          type="button"
          onClick={runInstall}
          className="shrink-0 rounded-lg border border-border-strong bg-surface px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-surface-3"
        >
          Retry
        </button>
      )}

      {(phase === "error" || phase === "manual") && (
        <button
          type="button"
          onClick={() => setPhase("idle")}
          aria-label="Dismiss"
          className="shrink-0 rounded-md p-1.5 text-ink-muted transition-colors hover:bg-surface-3 hover:text-ink"
        >
          <X size={16} weight="bold" />
        </button>
      )}
    </div>
  );
}
