import { FolderSimple } from "@phosphor-icons/react";
import { pickDownloadDir } from "../api/settings";

interface Props {
  dir: string;
  onChange: (dir: string) => void;
}

export function OutputDirPicker({ dir, onChange }: Props) {
  async function handleBrowse() {
    const picked = await pickDownloadDir();
    if (picked) onChange(picked);
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3">
      <FolderSimple weight="bold" size={18} className="shrink-0 text-ink-muted" />
      <span className="flex-1 truncate font-mono text-xs text-ink-muted">{dir || "(not set)"}</span>
      <button
        onClick={handleBrowse}
        className="shrink-0 rounded-md border border-border px-3 py-1 text-xs font-medium text-ink transition-colors hover:bg-surface-muted"
      >
        Browse
      </button>
    </div>
  );
}
