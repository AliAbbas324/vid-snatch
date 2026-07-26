import { X } from "@phosphor-icons/react";
import type { DownloadRow as DownloadRowType } from "../types";
import { cancelDownload } from "../api/download";
import { cancelPlaylistDownload } from "../api/playlist";

const STAGE_LABEL: Record<string, string> = {
  queued: "Queued",
  downloading: "Downloading",
  processing: "Processing",
  done: "Done",
  error: "Error",
  cancelled: "Cancelled",
};

const STAGE_BADGE: Record<string, string> = {
  queued: "bg-surface-muted text-ink-muted",
  downloading: "bg-pastel-blue-bg text-pastel-blue-text",
  processing: "bg-pastel-blue-bg text-pastel-blue-text",
  done: "bg-pastel-green-bg text-pastel-green-text",
  error: "bg-pastel-red-bg text-pastel-red-text",
  cancelled: "bg-pastel-yellow-bg text-pastel-yellow-text",
};

export function DownloadRow({ row }: { row: DownloadRowType }) {
  const active = row.stage === "downloading" || row.stage === "processing";

  function handleCancel() {
    // Cancelling a batch item's row cancels its whole batch (halts remaining
    // queued entries too) - there's no separate "cancel whole batch" control,
    // since only the currently-downloading row of a batch ever shows Cancel.
    if (row.batchId) {
      cancelPlaylistDownload(row.batchId);
    } else {
      cancelDownload(row.id);
    }
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm font-medium text-ink">{row.title}</span>
        <span
          className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide ${
            STAGE_BADGE[row.stage] ?? "bg-surface-muted text-ink-muted"
          }`}
        >
          {STAGE_LABEL[row.stage] ?? row.stage}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full bg-cta transition-[width] duration-300"
          style={{ width: `${Math.min(100, Math.max(0, row.percent))}%` }}
        />
      </div>
      <div className="flex items-center justify-between font-mono text-xs text-ink-muted">
        <span>
          {row.percent.toFixed(1)}%{row.speed && ` · ${row.speed}`}
          {row.eta && ` · ETA ${row.eta}`}
        </span>
        {active && (
          <button
            onClick={handleCancel}
            className="flex items-center gap-1 rounded-md px-1.5 py-0.5 font-sans normal-case text-pastel-red-text transition-colors hover:bg-pastel-red-bg"
          >
            <X weight="bold" size={12} />
            Cancel
          </button>
        )}
      </div>
      {row.errorMessage && (
        <p className="rounded-md bg-pastel-red-bg px-3 py-2 text-xs text-pastel-red-text">{row.errorMessage}</p>
      )}
    </div>
  );
}
