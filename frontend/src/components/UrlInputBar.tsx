import { useState } from "react";
import { ArrowRight, CircleNotch } from "@phosphor-icons/react";
import { fetchInfo } from "../api/mediaInfo";
import type { MediaInfo } from "../types";

interface Props {
  onInfo: (url: string, info: MediaInfo) => void;
}

export function UrlInputBar({ onInfo }: Props) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFetch() {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const info = await fetchInfo(url.trim());
      onInfo(url.trim(), info);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-6">
      <label htmlFor="video-url" className="text-xs font-medium uppercase tracking-wide text-ink-muted">
        Video URL
      </label>
      <div className="mt-2 flex gap-2">
        <input
          id="video-url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleFetch()}
          placeholder="https://…"
          className="flex-1 rounded-md border border-border bg-surface-muted px-3 py-2 font-mono text-sm text-ink placeholder:text-ink-muted focus:border-ink focus:outline-none"
        />
        <button
          onClick={handleFetch}
          disabled={loading}
          className="flex items-center gap-2 rounded-md bg-cta px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-cta-hover active:scale-[0.98] disabled:opacity-50"
        >
          {loading ? <CircleNotch weight="bold" className="animate-spin" size={16} /> : <ArrowRight weight="bold" size={16} />}
          {loading ? "Fetching" : "Fetch info"}
        </button>
      </div>
      {error && (
        <p className="mt-3 rounded-md bg-pastel-red-bg px-3 py-2 text-sm text-pastel-red-text">{error}</p>
      )}
    </div>
  );
}
