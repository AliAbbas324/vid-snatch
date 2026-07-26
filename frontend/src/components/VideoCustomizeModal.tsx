import { Modal } from "./Modal";
import { OutputDirPicker } from "./OutputDirPicker";
import { FormatSelectors } from "./FormatSelectors";
import { formatDuration } from "../lib/format";
import type { MediaInfo, DownloadRequest } from "../types";

interface Props {
  info: MediaInfo;
  outputDir: string;
  onOutputDirChange: (dir: string) => void;
  onSubmit: (req: Partial<DownloadRequest>) => void;
  submitting: boolean;
  submitError: string | null;
  onClose: () => void;
}

export function VideoCustomizeModal({
  info,
  outputDir,
  onOutputDirChange,
  onSubmit,
  submitting,
  submitError,
  onClose,
}: Props) {
  return (
    <Modal title="Download" onClose={onClose}>
      <div className="flex items-start gap-4 rounded-xl border border-border bg-surface-muted p-4">
        {info.thumbnail && (
          <img src={info.thumbnail} alt="" className="h-20 w-32 shrink-0 rounded-md border border-border object-cover" />
        )}
        <div>
          <p className="font-serif text-lg leading-tight text-ink">{info.title}</p>
          <p className="mt-1 font-mono text-xs text-ink-muted">{formatDuration(info.durationSec)}</p>
        </div>
      </div>

      <OutputDirPicker dir={outputDir} onChange={onOutputDirChange} />
      <FormatSelectors info={info} onSubmit={onSubmit} submitting={submitting} />
      {submitError && (
        <p className="rounded-md bg-pastel-red-bg px-3 py-2 text-sm text-pastel-red-text">{submitError}</p>
      )}
    </Modal>
  );
}
