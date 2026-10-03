import { createHashHistory, syncHistory } from "./history";
import type { AutoNavigation } from "./types";

/**
 * Hash synchronization adapter.
 * Connects the AutoNavigation instance to browser location hash.
 */
export function setupHashSync(navigation: AutoNavigation): () => void {
  return syncHistory(navigation, createHashHistory());
}
