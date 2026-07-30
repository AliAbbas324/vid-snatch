import { ArrowRight, CircleNotch, FolderSimple, LinkSimple, ListBullets, MagnifyingGlass, WarningCircle } from "@phosphor-icons/react";
import type { OmniMode } from "../App";

interface Props {
  viewTitle: string;
  viewSub: string;
  dirPath: string;
  mode: OmniMode;
  value: string;
  onValueChange: (v: string) => void;
  onModeChange: (m: OmniMode) => void;
  onSubmit: () => void;
  loading: boolean;
  error: string | null;
  onOpenPalette: () => void;
}

const MODE_META: Record<OmniMode, { icon: typeof LinkSimple; label: string; placeholder: string }> = {
  link: { icon: LinkSimple, label: "Link", placeholder: "https://…" },
  search: { icon: MagnifyingGlass, label: "Search", placeholder: "Search videos…" },
  playlist: { icon: ListBullets, label: "Playlist", placeholder: "https://…/playlist?list=…" },
};

export function TopBar({
  viewTitle,
  viewSub,
  dirPath,
  mode,
  value,
  onValueChange,
  onModeChange,
  onSubmit,
  loading,
  error,
  onOpenPalette,
}: Props) {
  const LeadIcon = MODE_META[mode].icon;

  return (
    <div className="shrink-0 border-b border-border px-5 py-4 md:px-7 md:py-5">
      <div className="mb-4.5 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="truncate text-2xl font-bold tracking-tight text-ink">{viewTitle}</div>
          <div className="truncate font-mono text-base text-ink-muted">{viewSub}</div>
        </div>
        <div className="hidden shrink-0 items-center gap-2 whitespace-nowrap rounded-full border border-border bg-surface-2 px-4 py-2 font-mono text-base text-ink-muted md:flex">
          <FolderSimple size={17} />
          {dirPath || "(not set)"}
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-xl border border-border-strong bg-surface-2 py-2 pl-4 pr-1.5 transition-colors focus-within:border-accent focus-within:ring-2 focus-within:ring-accent-wash">
        <LeadIcon size={19} className="shrink-0 text-ink-faint" />
        <input
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSubmit()}
          placeholder={MODE_META[mode].placeholder}
          className="min-w-0 flex-1 bg-transparent py-2.5 font-mono text-base text-ink placeholder:text-ink-muted focus:outline-none"
        />
        <div className="flex shrink-0 gap-1 rounded-lg bg-surface p-1">
          {(Object.keys(MODE_META) as OmniMode[]).map((m) => {
            const Icon = MODE_META[m].icon;
            return (
              <button
                type="button"
                key={m}
                onClick={() => onModeChange(m)}
                title={MODE_META[m].label}
                className={`flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2.5 text-base font-semibold transition-colors md:px-4 ${
                  mode === m ? "bg-surface-3 text-accent" : "text-ink-muted hover:text-ink"
                }`}
              >
                <Icon size={17} />
                <span className="hidden md:inline">{MODE_META[m].label}</span>
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={onOpenPalette}
          className="hidden shrink-0 rounded-md border border-border-strong bg-surface px-2.5 py-2 font-mono text-sm text-ink-muted transition-colors hover:border-ink-faint hover:bg-surface-3 md:inline-flex"
          aria-label="Open command palette"
        >
          ⌘K
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={loading}
          aria-label="Run"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-ink transition-colors hover:bg-accent-hover disabled:opacity-60"
        >
          {loading ? <CircleNotch size={19} weight="bold" className="animate-spin" /> : <ArrowRight size={19} weight="bold" />}
        </button>
      </div>

      {error && (
        <div className="mt-3 flex items-center gap-2 text-base text-danger">
          <WarningCircle size={17} weight="bold" />
          {error}
        </div>
      )}
    </div>
  );
}
