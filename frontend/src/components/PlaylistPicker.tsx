import { useState } from "react";
import { CaretUp, CaretDown, ListChecks, DownloadSimple } from "@phosphor-icons/react";
import { Modal } from "./Modal";
import { OutputDirPicker } from "./OutputDirPicker";
import { formatDuration } from "../lib/format";
import { EXTRACT_FORMATS, EXTRACT_QUALITIES, selectClass, labelClass } from "./formatConstants";
import { startPlaylistDownload } from "../api/playlist";
import type { DownloadMode, PlaylistDownloadRequest, PlaylistInfo } from "../types";

interface Props {
  url: string;
  info: PlaylistInfo;
  outputDir: string;
  onOutputDirChange: (dir: string) => void;
  onStarted: (batchId: string, entries: { id: string; title: string }[]) => void;
  onClose: () => void;
}

export function PlaylistPicker({ url, info, outputDir, onOutputDirChange, onStarted, onClose }: Props) {
  // `order` is both "which entries are selected" AND the exact download
  // sequence - selection order, not playlist index order, is what's honored.
  const [order, setOrder] = useState<string[]>([]);
  const [mode, setMode] = useState<DownloadMode>("video");
  const [extractFormat, setExtractFormat] = useState("mp3");
  const [extractQuality, setExtractQuality] = useState("good");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(id: string) {
    setOrder((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function selectAll() {
    setOrder(info.entries.map((e) => e.id));
  }

  function move(id: string, dir: -1 | 1) {
    setOrder((prev) => {
      const i = prev.indexOf(id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  async function handleDownload() {
    if (order.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const byId = new Map(info.entries.map((e) => [e.id, e]));
      const entries = order.map((id) => ({ id, url: byId.get(id)!.url }));
      const batchId = await startPlaylistDownload({
        playlistUrl: url,
        entries,
        mode,
        extractFormat: mode === "extract" ? extractFormat : undefined,
        extractQuality: mode === "extract" ? extractQuality : undefined,
        outputDir,
      } as PlaylistDownloadRequest);
      onStarted(
        batchId,
        order.map((id) => ({ id, title: `${byId.get(id)!.title} [${id}]` })),
      );
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title={info.title || "Playlist"} onClose={onClose}>
      {info.uploader && <p className="-mt-3 font-mono text-xs text-ink-muted">{info.uploader}</p>}

      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-ink-muted">
          {order.length} of {info.entries.length} selected
        </span>
        <button
          type="button"
          onClick={order.length === info.entries.length ? () => setOrder([]) : selectAll}
          className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-ink transition-colors hover:bg-surface-muted"
        >
          <ListChecks weight="bold" size={14} />
          {order.length === info.entries.length ? "Select none" : "Select all"}
        </button>
      </div>

      <div className="flex max-h-64 flex-col gap-2 overflow-y-auto pr-1">
        {info.entries.map((e) => {
          const pos = order.indexOf(e.id);
          const selected = pos !== -1;
          return (
            <div
              key={e.id}
              className={`flex items-center gap-3 rounded-lg border p-2 ${
                selected ? "border-border bg-surface-muted" : "border-transparent"
              }`}
            >
              <input type="checkbox" checked={selected} onChange={() => toggle(e.id)} className="accent-cta" />
              {e.thumbnail && <img src={e.thumbnail} alt="" className="h-10 w-16 shrink-0 rounded object-cover" />}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-ink">{e.title}</p>
                <p className="font-mono text-xs text-ink-muted">
                  #{e.index}
                  {e.durationSec > 0 && ` · ${formatDuration(e.durationSec)}`}
                </p>
              </div>
              {selected && (
                <div className="flex shrink-0 flex-col">
                  <button
                    type="button"
                    onClick={() => move(e.id, -1)}
                    disabled={pos === 0}
                    aria-label="Move up in download order"
                    className="rounded p-0.5 text-ink-muted hover:text-ink disabled:opacity-30"
                  >
                    <CaretUp weight="bold" size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(e.id, 1)}
                    disabled={pos === order.length - 1}
                    aria-label="Move down in download order"
                    className="rounded p-0.5 text-ink-muted hover:text-ink disabled:opacity-30"
                  >
                    <CaretDown weight="bold" size={12} />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

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

      {mode === "extract" && (
        <div className="grid grid-cols-2 gap-4">
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
            <select value={extractQuality} onChange={(e) => setExtractQuality(e.target.value)} className={selectClass}>
              {EXTRACT_QUALITIES.map((q) => (
                <option key={q} value={q}>
                  {q}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      <OutputDirPicker dir={outputDir} onChange={onOutputDirChange} />

      {error && <p className="rounded-md bg-pastel-red-bg px-3 py-2 text-sm text-pastel-red-text">{error}</p>}

      <button
        type="button"
        onClick={handleDownload}
        disabled={submitting || order.length === 0}
        className="flex w-fit items-center gap-2 rounded-md bg-cta px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-cta-hover active:scale-[0.98] disabled:opacity-50"
      >
        <DownloadSimple weight="bold" size={16} />
        {submitting ? "Starting…" : `Download ${order.length} selected`}
      </button>
    </Modal>
  );
}
