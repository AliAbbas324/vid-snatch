import { ArrowRight, CircleNotch, Compass, LinkSimple, ListBullets, MagnifyingGlass, WarningCircle } from "@phosphor-icons/react";
import type { SearchResult } from "../types";
import { formatDuration } from "../lib/format";

interface Props {
  results: SearchResult[];
  hasSearchedOnce: boolean;
  searching: boolean;
  fetchingId: string | null;
  openError: string | null;
  onSelect: (result: SearchResult) => void;
}

function SkeletonRow() {
  return (
    <div className="grid grid-cols-[84px_1fr_auto] items-center gap-4 rounded-xl border border-border bg-surface p-3.5">
      <div className="h-11.5 w-21 animate-shimmer rounded-lg" />
      <div className="flex flex-col gap-2">
        <div className="h-3 w-3/5 animate-shimmer rounded" />
        <div className="h-2.5 w-1/3 animate-shimmer rounded" />
      </div>
      <div className="h-2.5 w-10 animate-shimmer rounded" />
    </div>
  );
}

export function DiscoverView({ results, hasSearchedOnce, searching, fetchingId, openError, onSelect }: Props) {
  if (searching) {
    return (
      <div className="flex flex-col gap-2">
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border-strong px-6 py-16 text-center text-ink-muted">
        <Compass size={30} className="text-ink-faint" />
        <h4 className="text-[15px] font-bold text-ink">
          {hasSearchedOnce ? "No results for that search" : "Nothing here yet"}
        </h4>
        <p className="max-w-95 text-sm leading-relaxed">
          {hasSearchedOnce
            ? "Try a different query, or paste a direct video link instead."
            : "Paste a link, search YouTube, or drop a playlist URL to get started."}
        </p>
        {!hasSearchedOnce && (
          <div className="mt-1.5 flex flex-wrap justify-center gap-2">
            {[
              { icon: LinkSimple, label: "Link" },
              { icon: MagnifyingGlass, label: "Search" },
              { icon: ListBullets, label: "Playlist" },
            ].map(({ icon: Icon, label }) => (
              <span
                key={label}
                className="flex items-center gap-2 rounded-full border border-border bg-surface-2 px-3.5 py-1.5 font-mono text-xs text-ink-muted"
              >
                <Icon size={14} />
                {label}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-hidden rounded-xl border border-border">
        {results.map((r, i) => (
          <button
            type="button"
            key={r.id}
            onClick={() => onSelect(r)}
            disabled={fetchingId === r.id}
            className={`group grid w-full grid-cols-[84px_1fr_auto_auto] items-center gap-4 bg-surface p-3.5 text-left transition-colors hover:bg-surface-hover disabled:opacity-70 ${
              i > 0 ? "border-t border-border" : ""
            }`}
          >
            <div className="h-11.5 w-21 shrink-0 overflow-hidden rounded-lg bg-surface-2">
              {r.thumbnail && <img src={r.thumbnail} alt="" className="h-full w-full object-cover" />}
            </div>
            <div className="min-w-0">
              <div className="truncate text-sm font-medium text-ink">{r.title}</div>
              <div className="truncate font-mono text-xs text-ink-muted">{r.channel}</div>
            </div>
            <span className="font-mono text-xs text-ink-muted">
              {r.durationSec > 0 ? formatDuration(r.durationSec) : ""}
            </span>
            <span className="flex w-5 items-center justify-center text-ink-faint">
              {fetchingId === r.id ? (
                <CircleNotch size={16} weight="bold" className="animate-spin" />
              ) : (
                <ArrowRight
                  size={16}
                  weight="bold"
                  className="opacity-0 transition-opacity group-hover:text-accent group-hover:opacity-100"
                />
              )}
            </span>
          </button>
        ))}
      </div>
      {openError && (
        <div className="flex items-center gap-2 rounded-lg bg-danger-wash px-3.5 py-2.5 text-sm text-danger">
          <WarningCircle size={15} weight="bold" />
          {openError}
        </div>
      )}
    </div>
  );
}
