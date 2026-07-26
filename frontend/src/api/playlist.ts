import { GetPlaylistEntries, StartPlaylistDownload, CancelPlaylistDownload } from "../../wailsjs/go/main/App";
import type { PlaylistInfo, PlaylistDownloadRequest } from "../types";

export async function getPlaylistEntries(url: string): Promise<PlaylistInfo> {
  try {
    return await GetPlaylistEntries(url);
  } catch (err) {
    throw new Error(typeof err === "string" ? err : (err as Error)?.message ?? "Failed to load playlist");
  }
}

export async function startPlaylistDownload(req: PlaylistDownloadRequest): Promise<string> {
  try {
    return await StartPlaylistDownload(req);
  } catch (err) {
    throw new Error(typeof err === "string" ? err : (err as Error)?.message ?? "Failed to start playlist download");
  }
}

export function cancelPlaylistDownload(batchId: string): Promise<void> {
  return CancelPlaylistDownload(batchId);
}
