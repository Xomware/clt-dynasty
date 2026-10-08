import type { WindowLink } from "@/lib/desktop/deep-link";
import type { GroupId } from "@/lib/desktop/groups";
import { viewKey } from "@/lib/desktop/windows";

// A page the viewer left, named as it was when they left it, at its place in
// the browser's history (entries the shell pushed count up from 0).
export interface Stop {
  view: WindowLink;
  label: string;
  depth: number;
}

// What a Buzz City history entry carries: the drill path that led to it, the
// page Back returns to, and where the page was scrolled when it was left.
export interface Entry {
  depth: number;
  trail: Stop[];
  prev: Stop | null;
  group: GroupId | null;
  scrollY: number;
}

const MAX_TRAIL = 8;

export const sameView = (a: WindowLink, b: WindowLink) => a.kind === b.kind && viewKey(a.kind, a.params) === viewKey(b.kind, b.params);

// Next keeps its router state in history.state too, so ours sits under one key.
export function readEntry(state: unknown): Entry | null {
  const entry = (state as { clt?: Entry } | null)?.clt;
  return entry && typeof entry.depth === "number" && Array.isArray(entry.trail) ? entry : null;
}

export const firstEntry = (group: GroupId | null): Entry => ({ depth: 0, trail: [], prev: null, group, scrollY: 0 });

// A drill adds the page left to the path; a jump from the nav starts a new one.
// Drilling back into a page already on the path cuts the loop off.
export function nextEntry(from: Entry, left: Stop, to: WindowLink, group: GroupId | null, drill: boolean): Entry {
  const path = drill ? [...from.trail, left] : [];
  const loop = path.findIndex((s) => sameView(s.view, to));
  const trail = (loop === -1 ? path : path.slice(0, loop)).slice(-MAX_TRAIL);
  return { depth: from.depth + 1, trail, prev: left, group, scrollY: 0 };
}
