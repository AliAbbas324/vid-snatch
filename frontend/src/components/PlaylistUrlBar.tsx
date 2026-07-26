import { useState } from "react";
import { ListBullets, CircleNotch } from "@phosphor-icons/react";
import { getPlaylistEntries } from "../api/playlist";
import type { PlaylistInfo } from "../types";

interface Props {
  onEntries: (url: string, info: PlaylistInfo) => void;
}

// Visually separate from VideoSearchBox on purpose: yt-dlp's search only
// returns videos (no playlist-search extractor exists), so playlists need
// their own paste-a-URL entry point rather than being mixed into results.
export function PlaylistUrlBar({ onEntries }: Props) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLoad() {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const info = await getPlaylistEntries(url.trim());
      onEntries(url.trim(), info);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 border-t border-border pt-4">
      <label htmlFor="playlist-url" className="text-xs font-medium uppercase tracking-wide text-ink-muted">
        Playlist URL
      </label>
      <div className="flex gap-2">
        <input
          id="playlist-url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleLoad()}
          placeholder="https://…/playlist?list=…"
          className="flex-1 rounded-md border border-border bg-surface-muted px-3 py-2 font-mono text-sm text-ink placeholder:text-ink-muted focus:border-ink focus:outline-none"
        />
        <button
          onClick={handleLoad}
          disabled={loading}
          className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface-muted disabled:opacity-50"
        >
          {loading ? (
            <CircleNotch weight="bold" className="animate-spin" size={16} />
          ) : (
            <ListBullets weight="bold" size={16} />
          )}
        </button>
      </div>
      {error && <p className="rounded-md bg-pastel-red-bg px-3 py-2 text-xs text-pastel-red-text">{error}</p>}
    </div>
  );
}
