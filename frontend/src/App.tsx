import { useEffect, useMemo, useRef, useState } from "react";
import {
  CircleHalf,
  GearSix,
  LinkSimple,
  ListBullets,
  MagnifyingGlass,
  Moon,
  Sun,
  Trash,
  TrayArrowDown,
} from "@phosphor-icons/react";
import { Rail, type View } from "./components/Rail";
import { TopBar } from "./components/TopBar";
import { DiscoverView } from "./components/DiscoverView";
import { DownloadsView, type DownloadFilter } from "./components/DownloadsView";
import { SettingsView } from "./components/SettingsView";
import { Inspector } from "./components/Inspector";
import { PlaylistInspector } from "./components/PlaylistInspector";
import { CommandPalette, type PaletteAction } from "./components/CommandPalette";
import { Toast, type ToastState } from "./components/Toast";
import { useTheme } from "./theme/useTheme";
import { useDownloadProgress } from "./events/useDownloadProgress";
import { fetchInfo } from "./api/mediaInfo";
import { searchVideos } from "./api/search";
import { getPlaylistEntries } from "./api/playlist";
import { startDownload, cancelDownload } from "./api/download";
import { cancelPlaylistDownload } from "./api/playlist";
import { getSettings, saveSettings } from "./api/settings";
import type { DownloadRequest, DownloadRow, MediaInfo, PlaylistInfo, SearchResult, Settings } from "./types";

export type OmniMode = "link" | "search" | "playlist";

const VIEW_META: Record<View, { title: string; sub: string }> = {
  discover: { title: "Discover", sub: "Paste a link, search, or load a playlist" },
  downloads: { title: "Downloads", sub: "" },
  settings: { title: "Settings", sub: "Output folder, appearance and history" },
};

function App() {
  const { theme, setTheme, cycleTheme } = useTheme();
  const { downloads, registerDownload, registerBatch, removeDownload, clearCompleted } = useDownloadProgress();

  const [view, setView] = useState<View>("discover");
  const [settings, setSettings] = useState<Settings | null>(null);
  const outputDir = settings?.downloadPath ?? "";

  const [omniMode, setOmniMode] = useState<OmniMode>("link");
  const [omniValue, setOmniValue] = useState("");
  const [omniLoading, setOmniLoading] = useState(false);
  const [omniError, setOmniError] = useState<string | null>(null);

  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [hasSearchedOnce, setHasSearchedOnce] = useState(false);
  const [searching, setSearching] = useState(false);
  const [fetchingId, setFetchingId] = useState<string | null>(null);
  const [openError, setOpenError] = useState<string | null>(null);

  const [activeVideo, setActiveVideo] = useState<{ url: string; info: MediaInfo } | null>(null);
  const [playlistPicker, setPlaylistPicker] = useState<{ url: string; info: PlaylistInfo } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [retryRequests, setRetryRequests] = useState<Record<string, { req: DownloadRequest; thumbnail?: string }>>({});

  const [downloadFilter, setDownloadFilter] = useState<DownloadFilter>("all");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    getSettings().then(setSettings);
  }, []);

  function showToast(text: string, kind: ToastState["kind"] = "success") {
    setToast({ text, kind });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }

  const downloadRows = useMemo<DownloadRow[]>(
    () => Object.values(downloads).sort((a, b) => (a.id < b.id ? 1 : -1)),
    [downloads],
  );
  const activeCount = downloadRows.filter((r) => r.stage === "downloading" || r.stage === "processing").length;
  const queuedCount = downloadRows.filter((r) => r.stage === "queued").length;
  const completedCount = downloadRows.filter((r) => r.stage === "done" || r.stage === "error" || r.stage === "cancelled").length;

  const headerSub = view === "downloads" ? `${activeCount} active · ${queuedCount} queued` : VIEW_META[view].sub;

  /* ---------------- omnibox ---------------- */
  function handleOmniModeChange(mode: OmniMode) {
    setOmniMode(mode);
    setOmniValue("");
    setOmniError(null);
  }

  async function handleOmniSubmit() {
    const val = omniValue.trim();
    if (!val) {
      setOmniError(omniMode === "search" ? "Type something to search for." : "Paste a URL first.");
      return;
    }
    setOmniError(null);
    setOmniLoading(true);
    try {
      if (omniMode === "link") {
        const info = await fetchInfo(val);
        setActiveVideo({ url: val, info });
        setOmniValue("");
      } else if (omniMode === "playlist") {
        const info = await getPlaylistEntries(val);
        setPlaylistPicker({ url: val, info });
        setOmniValue("");
      } else {
        setView("discover");
        setSearching(true);
        try {
          const results = await searchVideos(val);
          setSearchResults(results);
          setHasSearchedOnce(true);
        } finally {
          setSearching(false);
        }
      }
    } catch (err) {
      setOmniError((err as Error).message);
    } finally {
      setOmniLoading(false);
    }
  }

  async function handleSelectResult(result: SearchResult) {
    setFetchingId(result.id);
    setOpenError(null);
    try {
      const info = await fetchInfo(result.url);
      setActiveVideo({ url: result.url, info });
    } catch (err) {
      setOpenError((err as Error).message);
    } finally {
      setFetchingId(null);
    }
  }

  /* ---------------- output dir (persisted) ---------------- */
  async function handleOutputDirChange(dir: string) {
    if (!settings) return;
    const next = { ...settings, downloadPath: dir };
    setSettings(next);
    try {
      await saveSettings(next);
      showToast("Output folder updated");
    } catch (err) {
      showToast((err as Error).message, "error");
    }
  }

  /* ---------------- single video download ---------------- */
  async function handleVideoSubmit(partial: Partial<DownloadRequest>) {
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
      registerDownload(id, title, info.thumbnail);
      setRetryRequests((prev) => ({ ...prev, [id]: { req, thumbnail: info.thumbnail } }));
      setActiveVideo(null);
      showToast("Added to queue");
    } catch (err) {
      setSubmitError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  /* ---------------- downloads table actions ---------------- */
  function handleCancel(row: DownloadRow) {
    if (row.batchId) cancelPlaylistDownload(row.batchId);
    else cancelDownload(row.id);
  }

  async function handleRetry(row: DownloadRow) {
    const stored = retryRequests[row.id];
    if (!stored) return;
    const { req, thumbnail } = stored;
    try {
      const newId = await startDownload(req);
      removeDownload(row.id);
      registerDownload(newId, req.title, thumbnail);
      setRetryRequests((prev) => {
        const next = { ...prev };
        delete next[row.id];
        next[newId] = stored;
        return next;
      });
      showToast("Retrying download");
    } catch (err) {
      showToast((err as Error).message, "error");
    }
  }

  function handleClearHistory() {
    clearCompleted();
    showToast("History cleared");
  }

  /* ---------------- command palette ---------------- */
  const paletteActions = useMemo<PaletteAction[]>(
    () => [
      { label: "Go to Discover", icon: MagnifyingGlass, run: () => setView("discover") },
      { label: "Go to Downloads", icon: TrayArrowDown, run: () => setView("downloads") },
      { label: "Go to Settings", icon: GearSix, run: () => setView("settings") },
      { label: "Paste a link", icon: LinkSimple, run: () => { setView("discover"); handleOmniModeChange("link"); } },
      { label: "Search YouTube", icon: MagnifyingGlass, run: () => { setView("discover"); handleOmniModeChange("search"); } },
      { label: "Load a playlist", icon: ListBullets, run: () => { setView("discover"); handleOmniModeChange("playlist"); } },
      { label: "Switch to light theme", icon: Sun, run: () => setTheme("light") },
      { label: "Switch to dark theme", icon: Moon, run: () => setTheme("dark") },
      { label: "Match system theme", icon: CircleHalf, run: () => setTheme("auto") },
      { label: "Clear completed history", icon: Trash, run: () => { setView("settings"); handleClearHistory(); } },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
        return;
      }
      if (e.key === "Escape") {
        if (paletteOpen) setPaletteOpen(false);
        else if (activeVideo) setActiveVideo(null);
        else if (playlistPicker) setPlaylistPicker(null);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [paletteOpen, activeVideo, playlistPicker]);

  return (
    <div className="flex h-screen min-w-0 bg-bg text-ink">
      <Rail
        view={view}
        onViewChange={setView}
        activeCount={activeCount + queuedCount}
        onOpenPalette={() => setPaletteOpen(true)}
        theme={theme}
        onCycleTheme={cycleTheme}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          viewTitle={VIEW_META[view].title}
          viewSub={headerSub}
          dirPath={outputDir}
          mode={omniMode}
          value={omniValue}
          onValueChange={setOmniValue}
          onModeChange={handleOmniModeChange}
          onSubmit={handleOmniSubmit}
          loading={omniLoading}
          error={omniError}
          onOpenPalette={() => setPaletteOpen(true)}
        />

        <div className="min-w-0 flex-1 overflow-y-auto px-5 py-5 md:px-8 md:py-7">
          {view === "discover" && (
            <DiscoverView
              results={searchResults}
              hasSearchedOnce={hasSearchedOnce}
              searching={searching}
              fetchingId={fetchingId}
              openError={openError}
              onSelect={handleSelectResult}
            />
          )}
          {view === "downloads" && (
            <DownloadsView
              rows={downloadRows}
              filter={downloadFilter}
              onFilterChange={setDownloadFilter}
              retryableIds={new Set(Object.keys(retryRequests))}
              onCancel={handleCancel}
              onRetry={handleRetry}
            />
          )}
          {view === "settings" && (
            <SettingsView
              outputDir={outputDir}
              onOutputDirChange={handleOutputDirChange}
              theme={theme}
              onThemeChange={setTheme}
              completedCount={completedCount}
              onClearHistory={handleClearHistory}
            />
          )}
        </div>
      </div>

      <Inspector
        open={activeVideo !== null}
        info={activeVideo?.info ?? null}
        outputDir={outputDir}
        onOutputDirChange={handleOutputDirChange}
        onSubmit={handleVideoSubmit}
        submitting={submitting}
        submitError={submitError}
        onClose={() => setActiveVideo(null)}
      />

      <PlaylistInspector
        open={playlistPicker !== null}
        url={playlistPicker?.url ?? ""}
        info={playlistPicker?.info ?? null}
        outputDir={outputDir}
        onOutputDirChange={handleOutputDirChange}
        onStarted={(batchId, entries) => {
          registerBatch(batchId, entries);
          setPlaylistPicker(null);
          showToast(`Queued ${entries.length} downloads from playlist`);
        }}
        onClose={() => setPlaylistPicker(null)}
      />

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} actions={paletteActions} />
      <Toast toast={toast} />
    </div>
  );
}

export default App;
