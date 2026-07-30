import { GetSettings, SaveSettings, PickDownloadDir, PickFile } from "../../wailsjs/go/main/App";
import type { Settings } from "../types";

export function getSettings(): Promise<Settings> {
  return GetSettings();
}

export function saveSettings(d: Settings): Promise<void> {
  return SaveSettings(d);
}

/** Resolves to "" if the user cancels the dialog - callers should treat that as a no-op. */
export function pickDownloadDir(): Promise<string> {
  return PickDownloadDir();
}

/** Resolves to "" if the user cancels the dialog - callers should treat that as a no-op. */
export function pickFile(): Promise<string> {
  return PickFile();
}
