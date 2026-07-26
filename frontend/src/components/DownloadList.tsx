import type { DownloadRow as DownloadRowType } from "../types";
import { DownloadRow } from "./DownloadRow";

interface Props {
  rows: DownloadRowType[];
  heading?: string;
}

export function DownloadList({ rows, heading = "Downloads" }: Props) {
  if (rows.length === 0) return null;
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-xs font-medium uppercase tracking-wide text-ink-muted">{heading}</h2>
      {rows.map((row, i) => (
        <div key={row.id} className="animate-fade-in-up" style={{ animationDelay: `${i * 80}ms` }}>
          <DownloadRow row={row} />
        </div>
      ))}
    </div>
  );
}
