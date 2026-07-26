import { useState } from "react";
import { fetchInfo } from "../api/mediaInfo";
import { SearchResultCard } from "./SearchResultCard";
import type { MediaInfo, SearchResult } from "../types";

interface Props {
  results: SearchResult[];
  onSelect: (url: string, info: MediaInfo) => void;
}

export function SearchResultsGrid({ results, onSelect }: Props) {
  const [fetchingId, setFetchingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSelect(result: SearchResult) {
    setFetchingId(result.id);
    setError(null);
    try {
      const info = await fetchInfo(result.url);
      onSelect(result.url, info);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setFetchingId(null);
    }
  }

  if (results.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {results.map((r) => (
        <SearchResultCard key={r.id} result={r} loading={fetchingId === r.id} onSelect={() => handleSelect(r)} />
      ))}
      {error && <p className="rounded-md bg-pastel-red-bg px-3 py-2 text-xs text-pastel-red-text">{error}</p>}
    </div>
  );
}
