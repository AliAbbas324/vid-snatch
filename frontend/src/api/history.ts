import { GetHistory, ClearHistory } from "../../wailsjs/go/main/App";
import type { HistoryEntry } from "../types";

export function getHistory(): Promise<HistoryEntry[]> {
  return GetHistory();
}

export function clearHistory(): Promise<void> {
  return ClearHistory();
}
