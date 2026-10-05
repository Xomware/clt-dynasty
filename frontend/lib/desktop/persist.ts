import { isKind } from "./registry";
import type { WindowState } from "./windows";

// Bump the version when the default layout changes, so every saved layout
// resets to it once.
const key = (sub: string) => `clt.desktop.v1:${sub}`;

// Storage can be missing, full, or blocked (private mode, disabled cookies),
// and a saved layout can be corrupt or name a window kind that no longer
// exists. Any of those means the default layout, never a broken desktop.
export function loadLayout(sub: string): WindowState[] | null {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(key(sub)) ?? "null");
    if (!Array.isArray(saved)) return null;
    return saved.filter((w: WindowState) => isKind(w.kind));
  } catch {
    return null;
  }
}

export function saveLayout(sub: string, windows: WindowState[]) {
  try {
    localStorage.setItem(key(sub), JSON.stringify(windows));
  } catch {
    // Unsaved is fine: the desktop keeps working from memory this session.
  }
}
