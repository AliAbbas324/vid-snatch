import { useState } from "react";
import { CaretDown, CaretUp, CircleNotch, DownloadSimple, ListBullets, ListChecks, WarningCircle, X } from "@phosphor-icons/react";
import { pickDownloadDir } from "../api/settings";
import { startPlaylistDownload } from "../api/playlist";
import { EXTRACT_FORMATS, EXTRACT_QUALITIES, selectClass, labelClass } from "./formatConstants";
import { formatDuration } from "../lib/format";
import type { DownloadMode, PlaylistDownloadRequest, PlaylistInfo } from "../types";

interface Props {
  open: boolean;
  url: string;
  info: PlaylistInfo | null;
  outputDir: string;
  onOutputDirChange: (dir: string) => void;
  onStarted: (batchId: string, entries: { id: string; title: string; thumbnail?: string }[]) => void;
  onClose: () => void;
}

function PlaylistForm({
  url,
  info,
  outputDir,
  onOutputDirChange,
  onStarted,
  onClose,
}: Omit<Props, "open" | "info"> & { info: PlaylistInfo }) {
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

  async function handleBrowse() {
    const picked = await pickDownloadDir();
    if (picked) onOutputDirChange(picked);
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
        order.map((id) => ({
          id,
          title: `${byId.get(id)!.title} [${id}]`,
          thumbnail: byId.get(id)!.thumbnail,
        })),
      );
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (info.entries.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-9 text-center text-ink-muted">
        <ListBullets size={30} className="text-ink-faint" />
        <h4 className="text-[15px] font-bold text-ink">No videos in this playlist</h4>
        <p className="max-w-80 text-sm leading-relaxed">
          Every entry may be private, deleted, or region-locked. Try a different playlist link.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6">
      {info.uploader && <p className="-mt-2 font-mono text-[13px] text-ink-muted">{info.uploader}</p>}

      <div className="flex items-center justify-between">
        <span className="font-mono text-[13px] text-ink-muted">
          {order.length} of {info.entries.length} selected
        </span>
        <button
          type="button"
          onClick={order.length === info.entries.length ? () => setOrder([]) : selectAll}
          className="flex items-center gap-2 rounded-lg border border-border-strong bg-surface-2 px-3 py-2 text-sm font-semibold text-ink transition-colors hover:bg-surface-3"
        >
          <ListChecks size={15} weight="bold" />
          {order.length === info.entries.length ? "Select none" : "Select all"}
        </button>
      </div>

      <div className="flex max-h-84 flex-col gap-2 overflow-y-auto pr-1">
        {info.entries.map((e) => {
          const pos = order.indexOf(e.id);
          const selected = pos !== -1;
          return (
            <div
              key={e.id}
              className={`grid grid-cols-[auto_68px_1fr_auto] items-center gap-3 rounded-lg border p-2 transition-colors ${
                selected ? "border-border bg-surface-2" : "border-transparent"
              }`}
            >
              <input type="checkbox" checked={selected} onChange={() => toggle(e.id)} className="h-4 w-4 accent-accent" />
              <div className="h-9.5 w-17 shrink-0 overflow-hidden rounded-md bg-surface-3">
                {e.thumbnail && <img src={e.thumbnail} alt="" className="h-full w-full object-cover" />}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm text-ink">{e.title}</p>
                <p className="font-mono text-xs text-ink-muted">
                  #{e.index}
                  {e.durationSec > 0 && ` · ${formatDuration(e.durationSec)}`}
                </p>
              </div>
              <div className={`flex flex-col ${selected ? "" : "invisible"}`}>
                <button
                  type="button"
                  onClick={() => move(e.id, -1)}
                  disabled={pos === 0}
                  aria-label="Move up in download order"
                  className="rounded p-1 text-ink-faint hover:text-ink disabled:opacity-25"
                >
                  <CaretUp size={14} weight="bold" />
                </button>
                <button
                  type="button"
                  onClick={() => move(e.id, 1)}
                  disabled={pos === order.length - 1}
                  aria-label="Move down in download order"
                  className="rounded p-1 text-ink-faint hover:text-ink disabled:opacity-25"
                >
                  <CaretDown size={14} weight="bold" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="inline-flex w-fit gap-1 rounded-lg bg-surface-2 p-1">
        {(["video", "audio", "extract"] satisfies DownloadMode[]).map((m) => (
          <button
            type="button"
            key={m}
            onClick={() => setMode(m)}
            className={`rounded-md px-4 py-2 text-sm font-semibold capitalize transition-colors ${
              mode === m ? "bg-surface-3 text-accent" : "text-ink-muted hover:text-ink"
            }`}
          >
            {m}
          </button>
        ))}
      </div>

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
        Output
        <div className="mt-2 flex gap-2.5">
          <input
            readOnly
            value={outputDir}
            className="min-w-0 flex-1 rounded-lg border border-border-strong bg-surface-2 px-3.5 py-2.5 font-mono text-sm text-ink-muted"
          />
          <button
            type="button"
            onClick={handleBrowse}
            className="shrink-0 rounded-lg border border-border-strong bg-surface-2 px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-surface-3"
          >
            Browse
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2.5 rounded-lg bg-danger-wash px-3.5 py-3 text-sm leading-relaxed text-danger">
          <WarningCircle size={16} weight="bold" className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={handleDownload}
        disabled={submitting || order.length === 0}
        className="mt-auto flex w-full items-center justify-center gap-2.5 rounded-lg bg-accent py-3 text-sm font-bold text-accent-ink transition-colors hover:bg-accent-hover active:scale-[0.98] disabled:opacity-60"
      >
        {submitting ? <CircleNotch size={17} weight="bold" className="animate-spin" /> : <DownloadSimple size={17} weight="bold" />}
        {submitting ? "Starting…" : `Download ${order.length} selected`}
      </button>
    </div>
  );
}

export function PlaylistInspector({ open, url, info, outputDir, onOutputDirChange, onStarted, onClose }: Props) {
  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/45 transition-opacity ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={onClose}
      />
      <div
        className={`fixed bottom-0 right-0 top-0 z-40 flex w-120 max-w-[92vw] flex-col border-l border-border-strong bg-surface shadow-2xl transition-transform ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-6 py-5">
          <div className="min-w-0">
            <div className="font-mono text-xs uppercase tracking-wide text-ink-muted">Discover / Playlist</div>
            <h3 className="mt-1 truncate text-base font-semibold text-ink">{info?.title || "Playlist"}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8.5 w-8.5 shrink-0 items-center justify-center rounded-lg text-ink-faint transition-colors hover:bg-surface-3 hover:text-ink"
          >
            <X size={16} weight="bold" />
          </button>
        </div>
        {info && (
          <PlaylistForm
            key={url}
            url={url}
            info={info}
            outputDir={outputDir}
            onOutputDirChange={onOutputDirChange}
            onStarted={onStarted}
            onClose={onClose}
          />
        )}
      </div>
    </>
  );
}
