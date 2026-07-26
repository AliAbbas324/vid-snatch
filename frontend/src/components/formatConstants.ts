export const EXTRACT_FORMATS = ["mp3", "m4a", "opus", "wav", "alac", "flac", "vorbis"];
export const EXTRACT_QUALITIES = ["best", "good", "normal", "bad", "worst"];

export const selectClass =
  "rounded-md border border-border bg-surface-muted px-3 py-2 text-sm text-ink focus:border-ink focus:outline-none";
export const labelClass = "flex flex-col gap-1 text-xs font-medium uppercase tracking-wide text-ink-muted";

export function extOf(list: { formatId: string; ext: string }[], id: string): string {
  return list.find((f) => f.formatId === id)?.ext ?? "";
}
