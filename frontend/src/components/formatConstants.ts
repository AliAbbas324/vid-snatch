export const EXTRACT_FORMATS = ["mp3", "m4a", "opus", "wav", "alac", "flac", "vorbis"];
export const EXTRACT_QUALITIES = ["best", "good", "normal", "bad", "worst"];

export const selectClass =
  "w-full rounded-lg border border-border-strong bg-surface-2 px-4 py-3 font-mono text-base text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-wash";
export const labelClass = "flex flex-col gap-2 font-mono text-sm font-bold uppercase tracking-wide text-ink-muted";

export function extOf(list: { formatId: string; ext: string }[], id: string): string {
  return list.find((f) => f.formatId === id)?.ext ?? "";
}
