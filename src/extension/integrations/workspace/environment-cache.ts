import type { EnvironmentInfo } from "./get-env-info";

import * as vscode from "vscode";

import { getEnvironmentInfo } from "./get-env-info";


// Cache duration in milliseconds (30 minutes)
const CACHE_DURATION = 30 * 60 * 1000;

interface CacheEntry {
  timestamp: number;
  data: EnvironmentInfo;
}

let envInfoCache: CacheEntry | null = null;

// Register configuration change listener
export function registerEnvironmentCacheEvents(context: vscode.ExtensionContext) {
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((event) => {
      // Invalidate cache if relevant environment settings change
      if (
        event.affectsConfiguration("python") // Python extension settings
        || event.affectsConfiguration("typescript") // TypeScript settings
        || event.affectsConfiguration("npm") // npm settings
        || event.affectsConfiguration("yarn") // yarn settings
      ) {
        invalidateEnvironmentInfoCache();
      }
    })
  );
}

export function invalidateEnvironmentInfoCache(): void {
  envInfoCache = null;
}

export async function getCachedEnvironmentInfo(): Promise<EnvironmentInfo> {
  const now = Date.now();

  // Return cached data if it exists and hasn't expired
  if (envInfoCache && now - envInfoCache.timestamp < CACHE_DURATION) {
    return envInfoCache.data;
  }

  // Fetch fresh data
  const freshData = await getEnvironmentInfo();

  // Update cache
  envInfoCache = {
    timestamp: now,
    data: freshData
  };

  return freshData;
}
