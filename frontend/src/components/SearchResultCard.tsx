import { CircleNotch } from "@phosphor-icons/react";
import type { SearchResult } from "../types";
import { formatDuration } from "../lib/format";

interface Props {
  result: SearchResult;
  loading: boolean;
  onSelect: () => void;
}

export function SearchResultCard({ result, loading, onSelect }: Props) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={loading}
      className="flex w-full items-start gap-3 rounded-xl border border-border bg-surface p-3 text-left transition-colors hover:bg-surface-muted disabled:opacity-60"
    >
      <div className="relative h-14 w-24 shrink-0 overflow-hidden rounded-md border border-border bg-surface-muted">
        {result.thumbnail && <img src={result.thumbnail} alt="" className="h-full w-full object-cover" />}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-surface/70">
            <CircleNotch weight="bold" className="animate-spin text-ink-muted" size={18} />
          </div>
        )}
      </div>
      <div className="min-w-0">
        <p className="line-clamp-2 text-sm font-medium leading-snug text-ink">{result.title}</p>
        <p className="mt-1 font-mono text-xs text-ink-muted">
          {result.channel}
          {result.durationSec > 0 && ` · ${formatDuration(result.durationSec)}`}
        </p>
      </div>
    </button>
  );
}
