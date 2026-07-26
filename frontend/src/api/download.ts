import { StartDownload, CancelDownload } from "../../wailsjs/go/main/App";
import type { DownloadRequest } from "../types";

export async function startDownload(req: DownloadRequest): Promise<string> {
  try {
    return await StartDownload(req);
  } catch (err) {
    throw new Error(typeof err === "string" ? err : (err as Error)?.message ?? "Failed to start download");
  }
}

export function cancelDownload(id: string): Promise<void> {
  return CancelDownload(id);
}
