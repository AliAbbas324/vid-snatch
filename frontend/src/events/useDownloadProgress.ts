import { useEffect, useRef, useState } from "react";
import { EventsOn } from "../../wailsjs/runtime/runtime";
import type { DownloadRow, Progress } from "../types";

interface ErrorPayload {
  id: string;
  message: string;
}

/**
 * Single shared subscription to the download event stream. EventsOn is a
 * global-by-name listener (not scoped per download ID), so this hook
 * dispatches every incoming event into the right row by matching payload.id.
 */
export function useDownloadProgress() {
  const [downloads, setDownloads] = useState<Record<string, DownloadRow>>({});
  const downloadsRef = useRef(downloads);
  downloadsRef.current = downloads;

  useEffect(() => {
    const offProgress = EventsOn("download:progress", (p: Progress) => {
      setDownloads((prev) => ({
        ...prev,
        [p.id]: { ...prev[p.id], ...p, title: prev[p.id]?.title ?? p.id },
      }));
    });

    const offError = EventsOn("download:error", (payload: ErrorPayload) => {
      setDownloads((prev) => {
        const existing = prev[payload.id];
        if (!existing) return prev;
        return { ...prev, [payload.id]: { ...existing, stage: "error", errorMessage: payload.message } };
      });
    });

    // Cleanup is essential here, not cosmetic: EventsOn registers a new global
    // listener every mount, and `wails dev`'s HMR reloads this module often -
    // without unsubscribing, progress events start firing into stale closures
    // (and eventually N times each) across reloads.
    return () => {
      offProgress();
      offError();
    };
  }, []);

  function registerDownload(id: string, title: string) {
    setDownloads((prev) => ({
      ...prev,
      [id]: { id, percent: 0, speed: "", eta: "", stage: "queued", title },
    }));
  }

  // Seeds every selected playlist entry as "queued" in one update, tagged with
  // batchId so DownloadRow's cancel button knows to call
  // cancelPlaylistDownload(batchId) instead of cancelDownload(id). The batch
  // runner emits real "download:progress" events per entry.ID exactly like an
  // ad-hoc download, so no separate batch-progress event stream is needed.
  function registerBatch(batchId: string, entries: { id: string; title: string }[]) {
    setDownloads((prev) => {
      const next = { ...prev };
      for (const e of entries) {
        next[e.id] = { id: e.id, percent: 0, speed: "", eta: "", stage: "queued", title: e.title, batchId };
      }
      return next;
    });
  }

  return { downloads, registerDownload, registerBatch };
}
