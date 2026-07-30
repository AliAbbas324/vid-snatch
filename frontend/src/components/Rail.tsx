import { Command, GearSix, MagnifyingGlass, Moon, CircleHalf, Sun, TrayArrowDown } from "@phosphor-icons/react";
import { Logo } from "./Logo";
import type { ThemeChoice } from "../theme/useTheme";

export type View = "discover" | "downloads" | "settings";

interface Props {
  view: View;
  onViewChange: (view: View) => void;
  activeCount: number;
  onOpenPalette: () => void;
  theme: ThemeChoice;
  onCycleTheme: () => void;
}

const THEME_ICON: Record<ThemeChoice, typeof Sun> = {
  auto: CircleHalf,
  light: Sun,
  dark: Moon,
};

function RailButton({
  active,
  label,
  onClick,
  children,
}: {
  active?: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`relative flex h-11 w-11 items-center justify-center rounded-lg transition-colors ${
        active ? "bg-accent-wash text-accent" : "text-ink-faint hover:bg-surface-3 hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

/** Fixed-width icon rail: it never needs to collapse or reflow, so it stays
 *  identical across every window size the app can be resized to. */
export function Rail({ view, onViewChange, activeCount, onOpenPalette, theme, onCycleTheme }: Props) {
  const ThemeIcon = THEME_ICON[theme];

  return (
    <div className="flex w-18 shrink-0 flex-col items-center border-r border-border bg-surface py-4">
      <Logo size={36} className="mb-5 shrink-0" />

      <div className="flex flex-col gap-1.5">
        <RailButton active={view === "discover"} label="Discover" onClick={() => onViewChange("discover")}>
          <MagnifyingGlass size={21} />
        </RailButton>
        <RailButton active={view === "downloads"} label="Downloads" onClick={() => onViewChange("downloads")}>
          <TrayArrowDown size={21} />
          {activeCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4.5 min-w-4.5 items-center justify-center rounded-full border-2 border-surface bg-accent px-1 font-mono text-[10px] font-bold text-accent-ink">
              {activeCount}
            </span>
          )}
        </RailButton>
        <RailButton active={view === "settings"} label="Settings" onClick={() => onViewChange("settings")}>
          <GearSix size={21} />
        </RailButton>
      </div>

      <div className="flex-1" />
      <div className="mb-2.5 h-px w-7 bg-border" />
      <RailButton label="Command palette" onClick={onOpenPalette}>
        <Command size={21} />
      </RailButton>
      <RailButton label="Toggle theme" onClick={onCycleTheme}>
        <ThemeIcon size={21} />
      </RailButton>
    </div>
  );
}
