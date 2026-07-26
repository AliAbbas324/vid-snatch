import { GetInfo } from "../../wailsjs/go/main/App";
import type { MediaInfo } from "../types";

export async function fetchInfo(url: string): Promise<MediaInfo> {
  try {
    return await GetInfo(url);
  } catch (err) {
    throw new Error(typeof err === "string" ? err : (err as Error)?.message ?? "Failed to fetch video info");
  }
}
