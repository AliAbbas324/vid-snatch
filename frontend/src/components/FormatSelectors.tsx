import { useState, type FormEvent } from "react";
import { DownloadSimple } from "@phosphor-icons/react";
import type { MediaInfo, DownloadMode, DownloadRequest } from "../types";
import { EXTRACT_FORMATS, EXTRACT_QUALITIES, selectClass, labelClass, extOf } from "./formatConstants";

interface Props {
  info: MediaInfo;
  onSubmit: (req: Partial<DownloadRequest>) => void;
  submitting: boolean;
}

export function FormatSelectors({ info, onSubmit, submitting }: Props) {
  const [mode, setMode] = useState<DownloadMode>("video");
  const [videoFormatId, setVideoFormatId] = useState(info.videoFormats[0]?.formatId ?? "");
  const [videoAudioFormatId, setVideoAudioFormatId] = useState(info.audioFormats[0]?.formatId ?? "none");
  const [audioFormatId, setAudioFormatId] = useState(
    info.audioFormats.find((f) => f.formatId !== "none")?.formatId ?? "",
  );
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
      if (videoAudioFormatId !== "none") {
        req.audioExt = extOf(info.audioFormats, videoAudioFormatId);
      }
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
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 rounded-xl border border-border bg-surface p-6">
      <div className="inline-flex w-fit gap-1 rounded-md bg-surface-muted p-1">
        {(["video", "audio", "extract"] satisfies DownloadMode[]).map((m) => (
          <button
            type="button"
            key={m}
            onClick={() => setMode(m)}
            className={`rounded px-3 py-1.5 text-sm font-medium capitalize transition-colors ${
              mode === m
                ? "border border-border bg-surface text-ink"
                : "border border-transparent text-ink-muted hover:text-ink"
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {mode === "video" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className={labelClass}>
            Video quality
            <select value={videoFormatId} onChange={(e) => setVideoFormatId(e.target.value)} className={selectClass}>
              {info.videoFormats.map((f) => (
                <option key={f.formatId} value={f.formatId}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>
          <label className={labelClass}>
            Audio track
            <select
              value={videoAudioFormatId}
              onChange={(e) => setVideoAudioFormatId(e.target.value)}
              className={selectClass}
            >
              {info.audioFormats.map((f) => (
                <option key={f.formatId} value={f.formatId}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {mode === "audio" && (
        <label className={labelClass}>
          Audio quality
          <select value={audioFormatId} onChange={(e) => setAudioFormatId(e.target.value)} className={selectClass}>
            {info.audioFormats
              .filter((f) => f.formatId !== "none")
              .map((f) => (
                <option key={f.formatId} value={f.formatId}>
                  {f.label}
                </option>
              ))}
          </select>
        </label>
      )}

      {mode === "extract" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className={labelClass}>
            Format
            <select value={extractFormat} onChange={(e) => setExtractFormat(e.target.value)} className={selectClass}>
              {EXTRACT_FORMATS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </label>
          <label className={labelClass}>
            Quality
            <select
              value={extractQuality}
              onChange={(e) => setExtractQuality(e.target.value)}
              className={selectClass}
            >
              {EXTRACT_QUALITIES.map((q) => (
                <option key={q} value={q}>
                  {q}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      <div className="flex flex-wrap items-end gap-4 border-t border-border pt-4">
        <label className={labelClass}>
          Start
          <input
            value={rangeStart}
            onChange={(e) => setRangeStart(e.target.value)}
            placeholder="00:00"
            className={`w-24 font-mono ${selectClass}`}
          />
        </label>
        <label className={labelClass}>
          End
          <input
            value={rangeEnd}
            onChange={(e) => setRangeEnd(e.target.value)}
            placeholder="optional"
            className={`w-24 font-mono ${selectClass}`}
          />
        </label>
        <label className="flex items-center gap-2 pb-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={writeSubs}
            onChange={(e) => setWriteSubs(e.target.checked)}
            className="accent-cta"
          />
          Download subtitles
        </label>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="flex w-fit items-center gap-2 rounded-md bg-cta px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-cta-hover active:scale-[0.98] disabled:opacity-50"
      >
        <DownloadSimple weight="bold" size={16} />
        {submitting ? "Starting…" : "Download"}
      </button>
    </form>
  );
}
