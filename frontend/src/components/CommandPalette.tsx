import { useEffect, useMemo, useRef, useState } from "react";
import { Command } from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";

export interface PaletteAction {
  label: string;
  icon: Icon;
  run: () => void;
}

interface Props {
  open: boolean;
  onClose: () => void;
  actions: PaletteAction[];
}

export function CommandPalette({ open, onClose, actions }: Props) {
  const [query, setQuery] = useState("");
  const [hi, setHi] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setHi(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return actions;
    return actions.filter((a) => a.label.toLowerCase().includes(q));
  }, [actions, query]);

  if (!open) return null;

  function run(i: number) {
    const action = filtered[i];
    if (!action) return;
    onClose();
    action.run();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHi((h) => Math.min(filtered.length - 1, h + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHi((h) => Math.max(0, h - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      run(hi);
    } else if (e.key === "Escape") {
      onClose();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-[14vh]"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-135 overflow-hidden rounded-2xl border border-border-strong bg-surface shadow-2xl">
        <div className="flex items-center gap-3 border-b border-border px-5 py-4.5">
          <Command size={18} className="text-ink-faint" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setHi(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command…"
            className="flex-1 bg-transparent font-mono text-base text-ink placeholder:text-ink-muted focus:outline-none"
          />
          <span className="font-mono text-sm text-ink-faint">ESC</span>
        </div>
        <div className="max-h-85 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="px-4 py-7 text-center text-base text-ink-muted">No matching commands.</div>
          ) : (
            filtered.map((a, i) => (
              <button
                type="button"
                key={a.label}
                onClick={() => run(i)}
                onMouseEnter={() => setHi(i)}
                className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left text-base transition-colors ${
                  i === hi ? "bg-accent-wash text-accent" : "text-ink"
                }`}
              >
                <a.icon size={19} className={i === hi ? "text-accent" : "text-ink-muted"} />
                <span className="flex-1">{a.label}</span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
