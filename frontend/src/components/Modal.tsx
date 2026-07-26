import type { ReactNode } from "react";
import { X } from "@phosphor-icons/react";

interface Props {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export function Modal({ title, onClose, children }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/20 p-6">
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col gap-5 overflow-y-auto rounded-xl border border-border bg-surface p-6 shadow-[0_2px_24px_rgba(0,0,0,0.08)]">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-lg text-ink">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
          >
            <X weight="bold" size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
