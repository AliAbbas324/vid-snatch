import { useState, type FormEvent } from "react";
import { CircleNotch, DownloadSimple, Info, WarningCircle, X } from "@phosphor-icons/react";
import type { MediaInfo, DownloadMode, DownloadRequest } from "../types";
import { formatDuration } from "../lib/format";
import { pickDownloadDir } from "../api/settings";
import { EXTRACT_FORMATS, EXTRACT_QUALITIES, selectClass, labelClass, extOf } from "./formatConstants";

interface Props {
  open: boolean;
  info: MediaInfo | null;
  outputDir: string;
  onOutputDirChange: (dir: string) => void;
  onSubmit: (req: Partial<DownloadRequest>) => void;
  submitting: boolean;
  submitError: string | null;
  onClose: () => void;
}

const MODE_LABEL: DownloadMode[] = ["video", "audio", "extract"];

function ModeSwitch({ mode, onChange }: { mode: DownloadMode; onChange: (m: DownloadMode) => void }) {
  return (
    <div className="inline-flex w-fit gap-1 rounded-lg bg-surface-2 p-1">
      {MODE_LABEL.map((m) => (
        <button
          type="button"
          key={m}
          onClick={() => onChange(m)}
          className={`rounded-md px-4.5 py-2.5 text-base font-semibold capitalize transition-colors ${
            mode === m ? "bg-surface-3 text-accent" : "text-ink-muted hover:text-ink"
          }`}
        >
          {m}
        </button>
      ))}
    </div>
  );
}

function EmptyFormatNotice({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg bg-surface-2 px-4 py-3.5 text-base leading-relaxed text-ink-muted">
      <Info size={18} weight="bold" className="mt-0.5 shrink-0 text-ink-faint" />
      {text}
    </div>
  );
}

function OutputDirRow({ dir, onChange }: { dir: string; onChange: (dir: string) => void }) {
  async function handleBrowse() {
    const picked = await pickDownloadDir();
    if (picked) onChange(picked);
  }
  return (
    <div className={labelClass}>
      Output
      <div className="mt-2 flex gap-2.5">
        <input
          readOnly
          value={dir}
          className="min-w-0 flex-1 rounded-lg border border-border-strong bg-surface-2 px-4 py-3 font-mono text-base text-ink-muted"
        />
        <button
          type="button"
          onClick={handleBrowse}
          className="shrink-0 rounded-lg border border-border-strong bg-surface-2 px-4.5 py-3 text-base font-semibold text-ink transition-colors hover:bg-surface-3"
        >
          Browse
        </button>
      </div>
    </div>
  );
}

/** Keyed by info.id from the parent so switching videos resets every field
 *  instead of carrying over the previous video's format selection. */
function InspectorForm({
  info,
  outputDir,
  onOutputDirChange,
  onSubmit,
  submitting,
  submitError,
}: Omit<Props, "open" | "onClose" | "info"> & { info: MediaInfo }) {
  const hasVideoFormats = info.videoFormats.length > 0;
  const audioOnlyFormats = info.audioFormats.filter((f) => f.formatId !== "none");
  const hasAudioFormats = audioOnlyFormats.length > 0;

  // Land on whichever mode this source can actually satisfy, instead of
  // defaulting to "video" and greeting the user with an empty select.
  const [mode, setMode] = useState<DownloadMode>(
    hasVideoFormats ? "video" : hasAudioFormats ? "audio" : "extract",
  );
  const [videoFormatId, setVideoFormatId] = useState(info.videoFormats[0]?.formatId ?? "");
  const [videoAudioFormatId, setVideoAudioFormatId] = useState(info.audioFormats[0]?.formatId ?? "none");
  const [audioFormatId, setAudioFormatId] = useState(audioOnlyFormats[0]?.formatId ?? "");
  const [extractFormat, setExtractFormat] = useState("mp3");
  const [extractQuality, setExtractQuality] = useState("good");
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");
  const [writeSubs, setWriteSubs] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const req: Partial<DownloadRequest> = {
      mode,
      rangeStart: rangeStart || undefined,
      rangeEnd: rangeEnd || undefined,
      writeSubs,
    };
    if (mode === "video") {
      req.videoFormatId = videoFormatId;
      req.videoExt = extOf(info.videoFormats, videoFormatId);
      req.audioFormatId = videoAudioFormatId;
      if (videoAudioFormatId !== "none") req.audioExt = extOf(info.audioFormats, videoAudioFormatId);
    } else if (mode === "audio") {
      req.audioFormatId = audioFormatId;
      req.audioExt = extOf(info.audioFormats, audioFormatId);
    } else {
      req.extractFormat = extractFormat;
      req.extractQuality = extractQuality;
    }
    onSubmit(req);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-6 overflow-y-auto p-6">
      <div className="aspect-video w-full overflow-hidden rounded-xl bg-surface-2">
        {info.thumbnail && <img src={info.thumbnail} alt="" className="h-full w-full object-cover" />}
      </div>
      <div>
        <p className="text-lg font-semibold leading-snug text-ink">{info.title}</p>
        <p className="mt-1.5 font-mono text-base text-ink-muted">{formatDuration(info.durationSec)}</p>
      </div>

      <ModeSwitch mode={mode} onChange={setMode} />

      {mode === "video" &&
        (hasVideoFormats ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className={labelClass}>
              Video
              <select
                value={videoFormatId}
                onChange={(e) => setVideoFormatId(e.target.value)}
                className={`mt-2 ${selectClass}`}
              >
                {info.videoFormats.map((f) => (
                  <option key={f.formatId} value={f.formatId}>
                    {f.label}
                  </option>
                ))}
              </select>
            </label>
            <label className={labelClass}>
              Audio
              <select
                value={videoAudioFormatId}
                onChange={(e) => setVideoAudioFormatId(e.target.value)}
                className={`mt-2 ${selectClass}`}
              >
                {info.audioFormats.map((f) => (
                  <option key={f.formatId} value={f.formatId}>
                    {f.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : (
          <EmptyFormatNotice text="No downloadable video formats for this source." />
        ))}

      {mode === "audio" &&
        (hasAudioFormats ? (
          <label className={labelClass}>
            Audio quality
            <select value={audioFormatId} onChange={(e) => setAudioFormatId(e.target.value)} className={`mt-2 ${selectClass}`}>
              {audioOnlyFormats.map((f) => (
                <option key={f.formatId} value={f.formatId}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <EmptyFormatNotice text="No downloadable audio-only formats for this source." />
        ))}

      {mode === "extract" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className={labelClass}>
            Format
            <select value={extractFormat} onChange={(e) => setExtractFormat(e.target.value)} className={`mt-2 ${selectClass}`}>
              {EXTRACT_FORMATS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </label>
          <label className={labelClass}>
            Quality
            <select value={extractQuality} onChange={(e) => setExtractQuality(e.target.value)} className={`mt-2 ${selectClass}`}>
              {EXTRACT_QUALITIES.map((q) => (
                <option key={q} value={q}>
                  {q}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      <div className={labelClass}>
        Trim
        <div className="mt-2 flex flex-wrap items-end gap-3.5">
          <input
            value={rangeStart}
            onChange={(e) => setRangeStart(e.target.value)}
            placeholder="00:00"
            className={`w-28 ${selectClass}`}
          />
          <span className="pb-3 text-base text-ink-muted normal-case">to</span>
          <input
            value={rangeEnd}
            onChange={(e) => setRangeEnd(e.target.value)}
            placeholder="end"
            className={`w-28 ${selectClass}`}
          />
          <label className="flex items-center gap-2.5 pb-3 font-sans text-base font-normal normal-case tracking-normal text-ink-muted">
            <input type="checkbox" checked={writeSubs} onChange={(e) => setWriteSubs(e.target.checked)} className="h-4.5 w-4.5 accent-accent" />
            Subtitles
          </label>
        </div>
      </div>

      <OutputDirRow dir={outputDir} onChange={onOutputDirChange} />

      {submitError && (
        <div className="flex items-start gap-2.5 rounded-lg bg-danger-wash px-4 py-3.5 text-base leading-relaxed text-danger">
          <WarningCircle size={18} weight="bold" className="mt-0.5 shrink-0" />
          {submitError}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting || (mode === "video" && !hasVideoFormats) || (mode === "audio" && !hasAudioFormats)}
        className="mt-auto flex w-full items-center justify-center gap-2.5 rounded-lg bg-accent py-3.5 text-base font-bold text-accent-ink transition-colors hover:bg-accent-hover active:scale-[0.98] disabled:opacity-60"
      >
        {submitting ? <CircleNotch size={19} weight="bold" className="animate-spin" /> : <DownloadSimple size={19} weight="bold" />}
        {submitting ? "Starting…" : "Start download"}
      </button>
    </form>
  );
}

/** Slide-in panel from the right. `max-w-[92vw]` keeps it usable even when
 *  the whole window is narrower than the panel's natural width. */
export function Inspector({ open, info, outputDir, onOutputDirChange, onSubmit, submitting, submitError, onClose }: Props) {
  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/45 transition-opacity ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={onClose}
      />
      <div
        className={`fixed bottom-0 right-0 top-0 z-40 flex w-135 max-w-[92vw] flex-col border-l border-border-strong bg-surface shadow-2xl transition-transform ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-6 py-5.5">
          <div>
            <div className="font-mono text-sm uppercase tracking-wide text-ink-muted">Discover / Format</div>
            <h3 className="mt-1 text-lg font-semibold text-ink">Configure download</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9.5 w-9.5 shrink-0 items-center justify-center rounded-lg text-ink-faint transition-colors hover:bg-surface-3 hover:text-ink"
          >
            <X size={18} weight="bold" />
          </button>
        </div>
        {info && (
          <InspectorForm
            key={info.id}
            info={info}
            outputDir={outputDir}
            onOutputDirChange={onOutputDirChange}
            onSubmit={onSubmit}
            submitting={submitting}
            submitError={submitError}
          />
        )}
      </div>
    </>
  );
}
