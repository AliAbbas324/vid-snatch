import { types, settings, history } from "../../wailsjs/go/models";

export type MediaInfo = types.MediaInfo;
export type VideoFormat = types.VideoFormat;
export type AudioFormat = types.AudioFormat;
export type DownloadRequest = types.DownloadRequest;
export type Settings = settings.Data;
export type SearchResult = types.SearchResult;
export type PlaylistEntry = types.PlaylistEntry;
export type PlaylistInfo = types.PlaylistInfo;
export type PlaylistDownloadEntry = types.PlaylistDownloadEntry;
export type PlaylistDownloadRequest = types.PlaylistDownloadRequest;
export type ToolVersions = types.ToolVersions;
export type HistoryEntry = history.Entry;

export type DownloadMode = "video" | "audio" | "extract";
// "queued" is frontend-only - Go never emits it, the row is just seeded at
// this stage locally and the first real "downloading" progress line supersedes it.
export type DownloadStage = "queued" | "downloading" | "processing" | "done" | "error" | "cancelled";

/**
 * Mirrors Go's types.Progress. Wails only generates TS for types that appear
 * in a bound method's signature - Progress is only ever an event payload
 * (emitted on "download:progress"), so it never gets generated and has to be
 * hand-mirrored here.
 */
export interface Progress {
  id: string;
  percent: number;
  speed: string;
  eta: string;
  stage: DownloadStage;
}

/** Per-download UI state: a Progress event plus the display info the row needs to render. */
export interface DownloadRow extends Progress {
  title: string;
  errorMessage?: string;
  /** Set only for playlist-batch items; lets the cancel button call
   *  cancelPlaylistDownload(batchId) instead of cancelDownload(id). */
  batchId?: string;
  /** Snapshotted from MediaInfo/PlaylistEntry at registration time - progress
   *  events never carry it, so it has to survive on the row itself. */
  thumbnail?: string;
  /** The folder this row was (or will be) saved into - lets a "done" row
   *  offer a "reveal in folder" action. */
  outputDir?: string;
  /** The original video URL - used for duplicate-download detection. */
  sourceUrl?: string;
}
