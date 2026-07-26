import { useState } from "react";
import { MagnifyingGlass, CircleNotch } from "@phosphor-icons/react";
import { searchVideos } from "../api/search";
import type { SearchResult } from "../types";

interface Props {
  onResults: (results: SearchResult[]) => void;
}

export function VideoSearchBox({ onResults }: Props) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch() {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const results = await searchVideos(query.trim());
      onResults(results);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="video-search" className="text-xs font-medium uppercase tracking-wide text-ink-muted">
        Search YouTube
      </label>
      <div className="flex gap-2">
        <input
          id="video-search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          placeholder="Search videos…"
          className="flex-1 rounded-md border border-border bg-surface-muted px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-ink focus:outline-none"
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface-muted disabled:opacity-50"
        >
          {loading ? (
            <CircleNotch weight="bold" className="animate-spin" size={16} />
          ) : (
            <MagnifyingGlass weight="bold" size={16} />
          )}
        </button>
      </div>
      {error && <p className="rounded-md bg-pastel-red-bg px-3 py-2 text-xs text-pastel-red-text">{error}</p>}
    </div>
  );
}
