import { SearchVideos } from "../../wailsjs/go/main/App";
import type { SearchResult } from "../types";

export async function searchVideos(query: string): Promise<SearchResult[]> {
  try {
    return await SearchVideos(query);
  } catch (err) {
    throw new Error(typeof err === "string" ? err : (err as Error)?.message ?? "Search failed");
  }
}
