import { useEffect, useState } from "react";
import { CircleHalf, FolderOpen, Moon, Sun, Trash } from "@phosphor-icons/react";
import { pickDownloadDir, pickFile } from "../api/settings";
import { getAppVersion, getToolVersions, openInFileManager } from "../api/system";
import type { Settings, ToolVersions } from "../types";
import type { ThemeChoice } from "../theme/useTheme";

interface Props {
  settings: Settings;
  onSettingsChange: (next: Settings) => void;
  onOutputDirChange: (dir: string) => void;
  theme: ThemeChoice;
  onThemeChange: (t: ThemeChoice) => void;
  completedCount: number;
  onClearHistory: () => void;
}

const THEME_OPTIONS: { key: ThemeChoice; label: string; icon: typeof Sun }[] = [
  { key: "auto", label: "Auto", icon: CircleHalf },
  { key: "light", label: "Light", icon: Sun },
  { key: "dark", label: "Dark", icon: Moon },
];

const QUALITY_OPTIONS = [
  { value: "480", label: "480p" },
  { value: "720", label: "720p" },
  { value: "1080", label: "1080p" },
  { value: "1440", label: "1440p (2K)" },
  { value: "2160", label: "2160p (4K)" },
];

const CODEC_OPTIONS = [
  { value: "avc1", label: "H.264 (avc1) — most compatible" },
  { value: "vp9", label: "VP9 — smaller files" },
  { value: "av01", label: "AV1 — best compression" },
];

const BROWSER_OPTIONS = [
  { value: "", label: "None" },
  { value: "chrome", label: "Chrome" },
  { value: "firefox", label: "Firefox" },
  { value: "brave", label: "Brave" },
  { value: "edge", label: "Edge" },
  { value: "opera", label: "Opera" },
  { value: "safari", label: "Safari" },
  { value: "vivaldi", label: "Vivaldi" },
  { value: "whale", label: "Whale" },
];

const inputClass =
  "mt-1 rounded-lg border border-border-strong bg-surface-2 px-4 py-3 font-mono text-base text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-wash";
const selectClass =
  "mt-1 rounded-lg border border-border-strong bg-surface-2 px-4 py-3 text-base text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-wash";
const fieldLabelClass = "text-sm font-semibold text-ink";
const fieldHelpClass = "text-sm text-ink-muted";

function SettingsCard({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-border bg-surface p-7 ${className}`}>
      <h3 className="mb-2 font-mono text-sm font-bold uppercase tracking-wide text-ink-muted">{title}</h3>
      {children}
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className={fieldLabelClass}>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={selectClass}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ToggleField({
  label,
  help,
  checked,
  onChange,
}: {
  label: string;
  help: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg bg-surface-2 px-4 py-3">
      <span className="min-w-0">
        <span className="block text-base font-semibold text-ink">{label}</span>
        <span className="mt-0.5 block text-sm leading-relaxed text-ink-muted">{help}</span>
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-5 w-5 shrink-0 accent-accent"
      />
    </label>
  );
}

function AboutCard({ className }: { className?: string }) {
  const [appVersion, setAppVersion] = useState<string | null>(null);
  const [versions, setVersions] = useState<ToolVersions | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAppVersion().then(setAppVersion);
    getToolVersions()
      .then(setVersions)
      .catch((err) => setError((err as Error).message));
  }, []);

  return (
    <SettingsCard title="About" className={className}>
      <div className="mt-2 flex flex-wrap gap-x-6 gap-y-2 font-mono text-base text-ink-muted">
        {appVersion && <div>Vid Snatch v{appVersion}</div>}
        {error ? (
          <div className="text-danger">{error}</div>
        ) : versions ? (
          <>
            <div>yt-dlp {versions.ytdlpVersion}</div>
            <div>ffmpeg {versions.ffmpegVersion}</div>
          </>
        ) : (
          <div>Checking tool versions…</div>
        )}
      </div>
    </SettingsCard>
  );
}

export function SettingsView({
  settings,
  onSettingsChange,
  onOutputDirChange,
  theme,
  onThemeChange,
  completedCount,
  onClearHistory,
}: Props) {
  async function handleBrowseDir() {
    const picked = await pickDownloadDir();
    if (picked) onOutputDirChange(picked);
  }

  async function handleBrowseConfigFile() {
    const picked = await pickFile();
    if (picked) onSettingsChange({ ...settings, configPath: picked });
  }

  function handleOpenOutputFolder() {
    if (settings.downloadPath) openInFileManager(settings.downloadPath);
  }

  return (
    <div className="grid grid-flow-row-dense grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3">
      <SettingsCard title="Output" className="lg:col-span-2">
        <label className="mt-3 flex flex-col gap-2.5 font-mono text-sm font-bold uppercase tracking-wide text-ink-muted">
          Save downloads to
          <div className="mt-1 flex flex-wrap gap-3">
            <input
              readOnly
              value={settings.downloadPath}
              className="min-w-0 flex-1 rounded-lg border border-border-strong bg-surface-2 px-4 py-3 font-mono text-base normal-case tracking-normal text-ink-muted"
            />
            <button
              type="button"
              onClick={handleBrowseDir}
              className="shrink-0 rounded-lg border border-border-strong bg-surface-2 px-4.5 py-3 text-base font-semibold normal-case tracking-normal text-ink transition-colors hover:bg-surface-3"
            >
              Browse
            </button>
            <button
              type="button"
              onClick={handleOpenOutputFolder}
              className="flex shrink-0 items-center gap-2 rounded-lg border border-border-strong bg-surface-2 px-4.5 py-3 text-base font-semibold normal-case tracking-normal text-ink transition-colors hover:bg-surface-3"
            >
              <FolderOpen size={17} />
              Open
            </button>
          </div>
        </label>
      </SettingsCard>

      <SettingsCard title="Appearance">
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-lg font-semibold text-ink">Theme</div>
            <div className="mt-1 text-base leading-relaxed text-ink-muted">
              Match your system, or lock Command Deck to one mode.
            </div>
          </div>
          <div className="flex shrink-0 gap-1 rounded-xl bg-surface-2 p-1">
            {THEME_OPTIONS.map(({ key, label, icon: Icon }) => (
              <button
                type="button"
                key={key}
                onClick={() => onThemeChange(key)}
                className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-base font-semibold transition-colors ${
                  theme === key ? "bg-surface text-accent shadow-sm" : "text-ink-muted hover:text-ink"
                }`}
              >
                <Icon size={17} />
                {label}
              </button>
            ))}
          </div>
        </div>
      </SettingsCard>

      <SettingsCard title="Downloads" className="lg:col-span-2">
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SelectField
            label="Concurrent downloads"
            value={String(settings.maxActiveDownloads)}
            onChange={(v) => onSettingsChange({ ...settings, maxActiveDownloads: Number(v) })}
            options={Array.from({ length: 10 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }))}
          />
          <SelectField
            label="Default video quality"
            value={String(settings.preferredVideoQuality)}
            onChange={(v) => onSettingsChange({ ...settings, preferredVideoQuality: Number(v) })}
            options={QUALITY_OPTIONS}
          />
          <SelectField
            label="Preferred codec"
            value={settings.preferredVideoCodec}
            onChange={(v) => onSettingsChange({ ...settings, preferredVideoCodec: v })}
            options={CODEC_OPTIONS}
          />
        </div>

        <label className="mt-4 flex flex-col gap-1">
          <span className={fieldLabelClass}>Bandwidth limit</span>
          <span className={fieldHelpClass}>e.g. 1M or 500K — leave blank for unlimited.</span>
          <input
            value={settings.limitRate}
            onChange={(e) => onSettingsChange({ ...settings, limitRate: e.target.value })}
            placeholder="Unlimited"
            className={inputClass}
          />
        </label>

        <div className="mt-4 flex flex-col gap-3">
          <ToggleField
            label="Show more formats"
            help="Include webm video/audio variants that are hidden by default."
            checked={settings.showMoreFormats}
            onChange={(v) => onSettingsChange({ ...settings, showMoreFormats: v })}
          />
          <ToggleField
            label="Split by chapters"
            help="Save each chapter as its own file, when the source has chapter markers."
            checked={settings.splitChapters}
            onChange={(v) => onSettingsChange({ ...settings, splitChapters: v })}
          />
        </div>
      </SettingsCard>

      <SettingsCard title="Network & Cookies">
        <div className="mt-3 flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className={fieldLabelClass}>Proxy</span>
            <span className={fieldHelpClass}>e.g. socks5://127.0.0.1:1080 — leave blank to connect directly.</span>
            <input
              value={settings.proxy}
              onChange={(e) => onSettingsChange({ ...settings, proxy: e.target.value })}
              placeholder="No proxy"
              className={inputClass}
            />
          </label>

          <SelectField
            label="Use cookies from browser"
            value={settings.browser}
            onChange={(v) => onSettingsChange({ ...settings, browser: v })}
            options={BROWSER_OPTIONS}
          />

          <label className="flex flex-col gap-1">
            <span className={fieldLabelClass}>yt-dlp config file</span>
            <span className={fieldHelpClass}>Advanced - points yt-dlp at a custom options file.</span>
            <div className="mt-1 flex flex-wrap gap-3">
              <input
                readOnly
                value={settings.configPath}
                placeholder="(not set)"
                className="min-w-0 flex-1 rounded-lg border border-border-strong bg-surface-2 px-4 py-3 font-mono text-base text-ink-muted"
              />
              <button
                type="button"
                onClick={handleBrowseConfigFile}
                className="shrink-0 rounded-lg border border-border-strong bg-surface-2 px-4.5 py-3 text-base font-semibold text-ink transition-colors hover:bg-surface-3"
              >
                Browse
              </button>
            </div>
          </label>
        </div>
      </SettingsCard>

      <SettingsCard title="History">
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-lg font-semibold text-ink">Clear completed history</div>
            <div className="mt-1 max-w-105 text-base leading-relaxed text-ink-muted">
              Removes done, cancelled and error rows from the downloads list, including the persisted history file.
              Active and queued items are untouched.
            </div>
          </div>
          <button
            type="button"
            onClick={onClearHistory}
            disabled={completedCount === 0}
            className="flex shrink-0 items-center gap-2 rounded-lg border border-danger-wash bg-danger-wash px-4.5 py-3 text-base font-bold text-danger transition-colors hover:bg-danger hover:text-white disabled:cursor-default disabled:opacity-50 disabled:hover:bg-danger-wash disabled:hover:text-danger"
          >
            <Trash size={18} weight="bold" />
            Clear
          </button>
        </div>
      </SettingsCard>

      <AboutCard className="lg:col-span-2" />
    </div>
  );
}
