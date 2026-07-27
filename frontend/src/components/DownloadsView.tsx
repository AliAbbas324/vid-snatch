import { ArrowClockwise, FilmSlate, Tray, X } from "@phosphor-icons/react";
import type { DownloadRow, DownloadStage } from "../types";

export type DownloadFilter = "all" | "active" | "queued" | "done" | "error";

interface Props {
  rows: DownloadRow[];
  filter: DownloadFilter;
  onFilterChange: (f: DownloadFilter) => void;
  retryableIds: Set<string>;
  onCancel: (row: DownloadRow) => void;
  onRetry: (row: DownloadRow) => void;
}

const STAGE_LABEL: Record<DownloadStage, string> = {
  queued: "Queued",
  downloading: "Downloading",
  processing: "Processing",
  done: "Done",
  error: "Error",
  cancelled: "Cancelled",
};

const STAGE_PILL: Record<DownloadStage, string> = {
  queued: "bg-surface-3 text-ink-muted",
  downloading: "bg-accent-wash text-accent",
  processing: "bg-accent-wash text-accent",
  done: "bg-success-wash text-success",
  error: "bg-danger-wash text-danger",
  cancelled: "bg-surface-3 text-ink-muted",
};

const STAGE_FILL: Record<DownloadStage, string> = {
  queued: "bg-ink-faint",
  downloading: "bg-accent",
  processing: "bg-accent",
  done: "bg-success",
  error: "bg-danger",
  cancelled: "bg-ink-faint",
};

const FILTERS: { key: DownloadFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Downloading" },
  { key: "queued", label: "Queued" },
  { key: "done", label: "Done" },
  { key: "error", label: "Error" },
];

function matches(row: DownloadRow, filter: DownloadFilter): boolean {
  if (filter === "all") return true;
  if (filter === "active") return row.stage === "downloading" || row.stage === "processing";
  return row.stage === filter;
}

// Shared by the header and every data row so columns line up exactly no
// matter how row content varies - a CSS grid with one template, not a table
// left to size its own columns per row.
const GRID_COLS =
  "grid grid-cols-[minmax(0,1fr)_auto_260px_100px] items-center gap-x-5 md:grid-cols-[minmax(0,1fr)_auto_280px_190px_100px]";

export function DownloadsView({ rows, filter, onFilterChange, retryableIds, onCancel, onRetry }: Props) {
  const filtered = rows.filter((r) => matches(r, filter));

  return (
    <div>
      <div className="mb-4.5 flex flex-wrap gap-2.5">
        {FILTERS.map((f) => (
          <button
            type="button"
            key={f.key}
            onClick={() => onFilterChange(f.key)}
            className={`rounded-full border px-4 py-2.5 text-base font-semibold transition-colors ${
              filter === f.key
                ? "border-accent bg-accent-wash text-accent"
                : "border-border bg-surface-2 text-ink-muted hover:border-border-strong hover:text-ink"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3.5 rounded-2xl border border-dashed border-border-strong px-6 py-18 text-center text-ink-muted">
          <Tray size={34} className="text-ink-faint" />
          <h4 className="text-lg font-bold text-ink">Nothing here yet</h4>
          <p className="max-w-95 text-base leading-relaxed">
            Paste a link or run a search from Discover to start your first download.
          </p>
        </div>
      ) : filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border-strong px-6 py-14 text-center text-base text-ink-muted">
          No downloads match this filter.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <div className="min-w-180">
            <div className={`${GRID_COLS} border-b border-border-strong bg-surface-2 px-4.5 py-3.5`}>
              <span className="font-mono text-xs font-bold uppercase tracking-wide text-ink-muted">Name</span>
              <span className="font-mono text-xs font-bold uppercase tracking-wide text-ink-muted">Status</span>
              <span className="font-mono text-xs font-bold uppercase tracking-wide text-ink-muted">Progress</span>
              <span className="hidden font-mono text-xs font-bold uppercase tracking-wide text-ink-muted md:block">
                Speed / ETA
              </span>
              <span />
            </div>

            {filtered.map((row) => {
              const active = row.stage === "downloading" || row.stage === "processing";
              const canCancel = active || row.stage === "queued";
              const canRetry = row.stage === "error" && retryableIds.has(row.id);
              return (
                <div
                  key={row.id}
                  className={`${GRID_COLS} border-b border-border px-4.5 py-4 transition-colors last:border-b-0 hover:bg-surface-2`}
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="h-12 w-19 shrink-0 overflow-hidden rounded-md bg-surface-3">
                      {row.thumbnail ? (
                        <img src={row.thumbnail} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-ink-faint">
                          <FilmSlate size={19} />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-base font-medium text-ink">{row.title}</div>
                      {row.errorMessage && (
                        <div className="mt-1 truncate font-mono text-sm text-danger">{row.errorMessage}</div>
                      )}
                    </div>
                  </div>

                  <span
                    className={`inline-flex w-fit items-center gap-2 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-wide ${STAGE_PILL[row.stage]}`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    {STAGE_LABEL[row.stage]}
                  </span>

                  <div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
                      <div
                        className={`h-full rounded-full transition-[width] duration-300 ${STAGE_FILL[row.stage]}`}
                        style={{ width: `${Math.min(100, Math.max(0, row.percent))}%` }}
                      />
                    </div>
                    <div className="mt-2 font-mono text-sm text-ink-muted">
                      {row.stage === "queued" ? "waiting" : `${row.percent.toFixed(1)}%`}
                    </div>
                  </div>

                  <div className="hidden whitespace-nowrap font-mono text-base text-ink-muted md:block">
                    {row.speed}
                    {row.eta && ` · ETA ${row.eta}`}
                  </div>

                  <div className="flex items-center justify-end gap-1.5">
                    {canCancel && (
                      <button
                        type="button"
                        onClick={() => onCancel(row)}
                        aria-label="Cancel"
                        className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-ink-faint transition-colors hover:bg-danger-wash hover:text-danger"
                      >
                        <X size={18} weight="bold" />
                      </button>
                    )}
                    {canRetry && (
                      <button
                        type="button"
                        onClick={() => onRetry(row)}
                        aria-label="Retry"
                        className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-ink-faint transition-colors hover:bg-accent-wash hover:text-accent"
                      >
                        <ArrowClockwise size={18} weight="bold" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
