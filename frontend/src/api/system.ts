import { GetToolVersions, OpenInFileManager } from "../../wailsjs/go/main/App";
import type { ToolVersions } from "../types";

export function getToolVersions(): Promise<ToolVersions> {
  return GetToolVersions();
}

export function openInFileManager(path: string): Promise<void> {
  return OpenInFileManager(path);
}
