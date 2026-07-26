import { useState } from "react";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import { UrlInputBar } from "./UrlInputBar";
import { VideoSearchBox } from "./VideoSearchBox";
import { SearchResultsGrid } from "./SearchResultsGrid";
import { PlaylistUrlBar } from "./PlaylistUrlBar";
import type { MediaInfo, PlaylistInfo, SearchResult } from "../types";

interface Props {
  collapsed: boolean;
  onToggleCollapse: () => void;
  onSelectVideo: (url: string, info: MediaInfo) => void;
  onPlaylist: (url: string, info: PlaylistInfo) => void;
}

export function SearchPanel({ collapsed, onToggleCollapse, onSelectVideo, onPlaylist }: Props) {
  const [results, setResults] = useState<SearchResult[]>([]);

  if (collapsed) {
    return (
      <div className="flex w-12 shrink-0 justify-center border-r border-border bg-surface pt-4">
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label="Expand search panel"
          className="rounded-md p-2 text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
        >
          <CaretRight weight="bold" size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex w-[340px] shrink-0 flex-col gap-6 overflow-y-auto border-r border-border bg-surface p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-medium uppercase tracking-wide text-ink-muted">Discover</h2>
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label="Collapse search panel"
          className="rounded-md p-1.5 text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
        >
          <CaretLeft weight="bold" size={16} />
        </button>
      </div>

      <UrlInputBar onInfo={onSelectVideo} />
      <VideoSearchBox onResults={setResults} />
      <SearchResultsGrid results={results} onSelect={onSelectVideo} />
      <PlaylistUrlBar onEntries={onPlaylist} />
    </div>
  );
}
