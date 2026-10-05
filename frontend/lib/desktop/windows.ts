import type { ViewParams } from "@/lib/view-params";

export type WindowParams = ViewParams;

// Kinds are the registry's keys. The reducer takes plain strings so it needs
// no registry, and the phone shell's screens can share the shape.
export interface WindowView {
  kind: string;
  params: WindowParams;
}

export interface WindowState {
  id: string;
  kind: string;
  params: WindowParams;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  minimized: boolean;
  maximized: boolean;
  // Absent until the window first navigates; see historyOf.
  history?: { views: WindowView[]; at: number };
}

export type WindowAction =
  | { type: "open"; kind: string; params: WindowParams; size: { w: number; h: number } }
  | { type: "close" | "focus" | "minimize" | "toggleMaximize"; id: string }
  | { type: "move"; id: string; x: number; y: number }
  | { type: "resize"; id: string; w: number; h: number }
  | { type: "navigate"; id: string; kind: string; params: WindowParams }
  | { type: "patch"; id: string; params: WindowParams }
  | { type: "back" | "forward"; id: string }
  | { type: "restore"; windows: WindowState[] };

// Matches --taskbar-height; windows live in the viewport above it.
export const TASKBAR_HEIGHT = 44;
// Desktop icons take the left edge, so new windows open clear of them.
const ICON_COLUMN = 112;

export function windowId(kind: string, params: WindowParams): string {
  return [kind, ...Object.keys(params).sort().map((k) => params[k])].join(":");
}

// A view's inner tab is in its link but not its identity, so changing it
// neither remounts the view nor stops a link to the view finding it.
export const viewKey = (kind: string, params: WindowParams) =>
  windowId(kind, Object.fromEntries(Object.entries(params).filter(([k]) => k !== "tab")));

// An emptied param leaves the link rather than hanging off it.
export const patchParams = (params: WindowParams, patch: WindowParams): WindowParams =>
  Object.fromEntries(Object.entries({ ...params, ...patch }).filter(([, v]) => v !== ""));

export function activeWindow(state: WindowState[]): WindowState | undefined {
  return state.filter((w) => !w.minimized).sort((a, b) => b.z - a.z)[0];
}

export function historyOf(w: WindowState): { views: WindowView[]; at: number } {
  return w.history ?? { views: [{ kind: w.kind, params: w.params }], at: 0 };
}

const topZ = (state: WindowState[]) => Math.max(0, ...state.map((w) => w.z));

function update(state: WindowState[], id: string, patch: Partial<WindowState>): WindowState[] {
  return state.map((w) => (w.id === id ? { ...w, ...patch } : w));
}

function go(state: WindowState[], id: string, step: number): WindowState[] {
  const w = state.find((w) => w.id === id);
  if (!w) return state;
  const { views, at } = historyOf(w);
  const view = views[at + step];
  if (!view) return state;
  return update(state, id, { ...view, history: { views, at: at + step } });
}

export function desktopReducer(state: WindowState[], action: WindowAction): WindowState[] {
  switch (action.type) {
    case "open": {
      const base = windowId(action.kind, action.params);
      // A window keeps its id when it navigates, so match on what it shows now.
      const showing = state.find((w) => viewKey(w.kind, w.params) === viewKey(action.kind, action.params));
      if (showing) return desktopReducer(state, { type: "focus", id: showing.id });
      let id = base;
      for (let n = 2; state.some((w) => w.id === id); n++) id = `${base}#${n}`;
      const step = 32 * (state.length % 6);
      const { kind, params, size } = action;
      const opened = { id, kind, params, ...size, x: ICON_COLUMN + 48 + step, y: 16 + step };
      return [...state, { ...opened, z: topZ(state) + 1, minimized: false, maximized: false }];
    }
    case "close":
      return state.filter((w) => w.id !== action.id);
    case "focus":
      if (activeWindow(state)?.id === action.id) return state;
      return update(state, action.id, { z: topZ(state) + 1, minimized: false });
    case "minimize":
      return update(state, action.id, { minimized: true });
    case "toggleMaximize": {
      const w = state.find((w) => w.id === action.id);
      if (!w) return state;
      return update(desktopReducer(state, { type: "focus", id: w.id }), w.id, { maximized: !w.maximized });
    }
    case "move":
      return update(state, action.id, { x: action.x, y: action.y });
    case "resize":
      return update(state, action.id, { w: action.w, h: action.h });
    case "navigate": {
      const w = state.find((w) => w.id === action.id);
      if (!w) return state;
      const { views, at } = historyOf(w);
      const view = { kind: action.kind, params: action.params };
      return update(state, w.id, { ...view, history: { views: [...views.slice(0, at + 1), view], at: at + 1 } });
    }
    case "patch": {
      const w = state.find((w) => w.id === action.id);
      if (!w) return state;
      const { views, at } = historyOf(w);
      const params = patchParams(w.params, action.params);
      return update(state, w.id, { params, history: { views: views.map((v, i) => (i === at ? { kind: w.kind, params } : v)), at } });
    }
    case "back":
      return go(state, action.id, -1);
    case "forward":
      return go(state, action.id, 1);
    case "restore":
      return action.windows;
  }
}

// An empty desktop until the league windows land; Home opens here first.
export const defaultLayout = (): WindowState[] => [];
