import { useEffect, useState } from "react";
import { SearchPanel } from "./components/SearchPanel";
import { DownloadsPanel } from "./components/DownloadsPanel";
import { VideoCustomizeModal } from "./components/VideoCustomizeModal";
import { PlaylistPicker } from "./components/PlaylistPicker";
import { useDownloadProgress } from "./events/useDownloadProgress";
import { startDownload } from "./api/download";
import { getSettings } from "./api/settings";
import type { MediaInfo, DownloadRequest, PlaylistInfo } from "./types";

function App() {
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [activeVideo, setActiveVideo] = useState<{ url: string; info: MediaInfo } | null>(null);
  const [playlistPicker, setPlaylistPicker] = useState<{ url: string; info: PlaylistInfo } | null>(null);
  const [outputDir, setOutputDir] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const { downloads, registerDownload, registerBatch } = useDownloadProgress();

  useEffect(() => {
    getSettings().then((s) => setOutputDir(s.downloadPath));
  }, []);

  async function handleSubmit(partial: Partial<DownloadRequest>) {
    if (!activeVideo) return;
    setSubmitting(true);
    setSubmitError(null);

    const { url, info } = activeVideo;
    const title = `${info.title} [${info.id}]`;
    const req: DownloadRequest = {
      url,
      outputDir,
      title,
      mode: partial.mode ?? "video",
      videoFormatId: partial.videoFormatId,
      audioFormatId: partial.audioFormatId,
      videoExt: partial.videoExt,
      audioExt: partial.audioExt,
      extractFormat: partial.extractFormat,
      extractQuality: partial.extractQuality,
      rangeStart: partial.rangeStart,
      rangeEnd: partial.rangeEnd,
      writeSubs: partial.writeSubs ?? false,
    } as DownloadRequest;

    try {
      const id = await startDownload(req);
      registerDownload(id, title);
      setActiveVideo(null);
    } catch (err) {
      setSubmitError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div id="App" className="flex h-screen flex-col">
      <header className="border-b border-border bg-surface px-6 py-4">
        <h1 className="font-serif text-2xl tracking-tight text-ink">Vid Snatch</h1>
        <p className="mt-0.5 font-mono text-xs text-ink-muted">paste a link, pick a format.</p>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <SearchPanel
          collapsed={leftCollapsed}
          onToggleCollapse={() => setLeftCollapsed((c) => !c)}
          onSelectVideo={(url, info) => {
            setSubmitError(null);
            setActiveVideo({ url, info });
          }}
          onPlaylist={(url, info) => setPlaylistPicker({ url, info })}
        />

        <main className="flex-1 overflow-y-auto p-6">
          <DownloadsPanel downloads={downloads} />
        </main>
      </div>

      {activeVideo && (
        <VideoCustomizeModal
          info={activeVideo.info}
          outputDir={outputDir}
          onOutputDirChange={setOutputDir}
          onSubmit={handleSubmit}
          submitting={submitting}
          submitError={submitError}
          onClose={() => setActiveVideo(null)}
        />
      )}

      {playlistPicker && (
        <PlaylistPicker
          url={playlistPicker.url}
          info={playlistPicker.info}
          outputDir={outputDir}
          onOutputDirChange={setOutputDir}
          onStarted={registerBatch}
          onClose={() => setPlaylistPicker(null)}
        />
      )}
    </div>
  );
}

export default App;
