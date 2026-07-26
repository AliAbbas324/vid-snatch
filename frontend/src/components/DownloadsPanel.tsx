import { useState } from "react";
import { Tabs } from "./Tabs";
import { DownloadList } from "./DownloadList";
import type { DownloadRow } from "../types";

const TABS = [
  { key: "active", label: "Active/Downloading" },
  { key: "completed", label: "Completed" },
];

export function DownloadsPanel({ downloads }: { downloads: Record<string, DownloadRow> }) {
  const [tab, setTab] = useState<"active" | "completed">("active");

  const rows = Object.values(downloads).sort((a, b) => (a.id < b.id ? 1 : -1));
  const downloadingNow = rows.filter((r) => r.stage === "downloading" || r.stage === "processing");
  const queued = rows.filter((r) => r.stage === "queued");
  const completed = rows.filter((r) => r.stage === "done" || r.stage === "error" || r.stage === "cancelled");

  return (
    <div className="flex flex-col gap-4">
      <Tabs tabs={TABS} active={tab} onChange={(k) => setTab(k as "active" | "completed")} />

      {tab === "active" ? (
        <div className="flex flex-col gap-6">
          <DownloadList heading="Downloading" rows={downloadingNow} />
          <DownloadList heading="In the Queue" rows={queued} />
          {downloadingNow.length === 0 && queued.length === 0 && (
            <p className="text-sm text-ink-muted">Nothing downloading right now.</p>
          )}
        </div>
      ) : (
        <DownloadList heading="Completed" rows={completed} />
      )}
      {tab === "completed" && completed.length === 0 && (
        <p className="text-sm text-ink-muted">No completed downloads yet.</p>
      )}
    </div>
  );
}
