import { CircleHalf, Moon, Sun, Trash } from "@phosphor-icons/react";
import { pickDownloadDir } from "../api/settings";
import type { ThemeChoice } from "../theme/useTheme";

interface Props {
  outputDir: string;
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

function SettingsCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-7">
      <h3 className="mb-2 font-mono text-sm font-bold uppercase tracking-wide text-ink-muted">{title}</h3>
      {children}
    </div>
  );
}

export function SettingsView({ outputDir, onOutputDirChange, theme, onThemeChange, completedCount, onClearHistory }: Props) {
  async function handleBrowse() {
    const picked = await pickDownloadDir();
    if (picked) onOutputDirChange(picked);
  }

  return (
    <div className="flex max-w-175 flex-col gap-6">
      <SettingsCard title="Output">
        <label className="mt-3 flex flex-col gap-2.5 font-mono text-sm font-bold uppercase tracking-wide text-ink-muted">
          Save downloads to
          <div className="mt-1 flex flex-wrap gap-3">
            <input
              readOnly
              value={outputDir}
              className="min-w-0 flex-1 rounded-lg border border-border-strong bg-surface-2 px-4 py-3 font-mono text-base normal-case tracking-normal text-ink-muted"
            />
            <button
              type="button"
              onClick={handleBrowse}
              className="shrink-0 rounded-lg border border-border-strong bg-surface-2 px-4.5 py-3 text-base font-semibold normal-case tracking-normal text-ink transition-colors hover:bg-surface-3"
            >
              Browse
            </button>
          </div>
        </label>
      </SettingsCard>

      <SettingsCard title="Appearance">
        <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
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

      <SettingsCard title="History">
        <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-lg font-semibold text-ink">Clear completed history</div>
            <div className="mt-1 max-w-105 text-base leading-relaxed text-ink-muted">
              Removes done, cancelled and error rows from the downloads list. Active and queued items are untouched.
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
    </div>
  );
}
