import {
  CheckDependencies,
  GetAppVersion,
  GetToolVersions,
  InstallDependencies,
  OpenInFileManager,
} from "../../wailsjs/go/main/App";
import type { DependencyStatus, ToolVersions } from "../types";

export function getToolVersions(): Promise<ToolVersions> {
  return GetToolVersions();
}

export function openInFileManager(path: string): Promise<void> {
  return OpenInFileManager(path);
}

export function getAppVersion(): Promise<string> {
  return GetAppVersion();
}

export function checkDependencies(): Promise<DependencyStatus> {
  return CheckDependencies();
}

/** Progress streams back via the "setup:progress" event - see useSetupProgress. */
export function installDependencies(): Promise<void> {
  return InstallDependencies();
}
