const KEY = "clt.recent.v1";
const MAX = 6;

// Newest first. Kept per browser; storage that's blocked just means no recent list.
export function readRecent(): string[] {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(saved) ? saved.filter((k): k is string => typeof k === "string") : [];
  } catch {
    return [];
  }
}

export function recordRecent(kind: string) {
  try {
    localStorage.setItem(KEY, JSON.stringify([kind, ...readRecent().filter((k) => k !== kind)].slice(0, MAX)));
  } catch {
    // Unsaved is fine; Start just shows its pinned programs.
  }
}
