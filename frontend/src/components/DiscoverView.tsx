import { CircleNotch, Compass, LinkSimple, ListBullets, MagnifyingGlass, WarningCircle } from "@phosphor-icons/react";
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
    <div className="flex gap-4 p-2.5">
      <div className="h-28 w-50 shrink-0 animate-shimmer rounded-xl" />
      <div className="flex min-w-0 flex-1 flex-col gap-2.5 py-1.5">
        <div className="h-4 w-4/5 animate-shimmer rounded" />
        <div className="h-4 w-3/5 animate-shimmer rounded" />
        <div className="mt-1.5 h-3.5 w-2/5 animate-shimmer rounded" />
      </div>
    </div>
  );
}

export function DiscoverView({ results, hasSearchedOnce, searching, fetchingId, openError, onSelect }: Props) {
  if (searching) {
    return (
      <div className="flex flex-col gap-2.5">
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3.5 rounded-2xl border border-dashed border-border-strong px-6 py-18 text-center text-ink-muted">
        <Compass size={34} className="text-ink-faint" />
        <h4 className="text-lg font-bold text-ink">
          {hasSearchedOnce ? "No results for that search" : "Nothing here yet"}
        </h4>
        <p className="max-w-105 text-base leading-relaxed">
          {hasSearchedOnce
            ? "Try a different query, or paste a direct video link instead."
            : "Paste a link, search YouTube, or drop a playlist URL to get started."}
        </p>
        {!hasSearchedOnce && (
          <div className="mt-2 flex flex-wrap justify-center gap-2.5">
            {[
              { icon: LinkSimple, label: "Link" },
              { icon: MagnifyingGlass, label: "Search" },
              { icon: ListBullets, label: "Playlist" },
            ].map(({ icon: Icon, label }) => (
              <span
                key={label}
                className="flex items-center gap-2 rounded-full border border-border bg-surface-2 px-4 py-2 font-mono text-sm text-ink-muted"
              >
                <Icon size={16} />
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
      <div className="flex flex-col">
        {results.map((r) => (
          <button
            type="button"
            key={r.id}
            onClick={() => onSelect(r)}
            disabled={fetchingId === r.id}
            className="flex w-full gap-4 rounded-xl p-2.5 text-left transition-colors hover:bg-surface-hover disabled:cursor-default"
          >
            <div className="relative h-28 w-50 shrink-0 overflow-hidden rounded-xl bg-surface-2">
              {r.thumbnail && <img src={r.thumbnail} alt="" className="h-full w-full object-cover" />}
              {r.durationSec > 0 && (
                <span className="absolute bottom-1.5 right-1.5 rounded bg-black/80 px-2 py-1 font-mono text-[13px] font-semibold text-white">
                  {formatDuration(r.durationSec)}
                </span>
              )}
              {fetchingId === r.id && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <CircleNotch size={26} weight="bold" className="animate-spin text-white" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1 py-1">
              <div className="line-clamp-2 text-lg font-semibold leading-snug text-ink">{r.title}</div>
              <div className="mt-2 truncate text-base text-ink-muted">{r.channel}</div>
            </div>
          </button>
        ))}
      </div>
      {openError && (
        <div className="flex items-center gap-2 rounded-lg bg-danger-wash px-4 py-3 text-base text-danger">
          <WarningCircle size={17} weight="bold" />
          {openError}
        </div>
      )}
    </div>
  );
}
