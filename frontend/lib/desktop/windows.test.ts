import { describe, expect, it } from "vitest";

import {
  activeWindow,
  defaultLayout,
  desktopReducer,
  historyOf,
  TASKBAR_HEIGHT,
  viewKey,
  type WindowParams,
  type WindowState,
} from "./windows";

const size = { w: 400, h: 300 };

function openAll(...kinds: string[]): WindowState[] {
  return kinds.reduce<WindowState[]>((s, kind) => desktopReducer(s, { type: "open", kind, params: {}, size }), []);
}

const byKind = (state: WindowState[], kind: string) => state.find((w) => w.kind === kind)!;

describe("desktopReducer", () => {
  it("opens a window on top of the others", () => {
    const state = openAll("scores", "standings");

    expect(state.map((w) => w.id)).toEqual(["scores", "standings"]);
    expect(byKind(state, "standings").z).toBeGreaterThan(byKind(state, "scores").z);
    expect(byKind(state, "standings")).toMatchObject({ w: 400, h: 300, minimized: false, maximized: false });
    expect(activeWindow(state)?.kind).toBe("standings");
  });

  it("focuses an already-open window instead of opening a second one", () => {
    let state = desktopReducer(openAll("scores", "standings"), { type: "minimize", id: "scores" });
    state = desktopReducer(state, { type: "open", kind: "scores", params: {}, size });

    expect(state).toHaveLength(2);
    expect(byKind(state, "scores").minimized).toBe(false);
    expect(activeWindow(state)?.id).toBe("scores");
  });

  it("opens the same kind again when the params differ", () => {
    let state = desktopReducer([], { type: "open", kind: "scores", params: { week: 1 }, size });
    state = desktopReducer(state, { type: "open", kind: "scores", params: { week: 2 }, size });
    state = desktopReducer(state, { type: "open", kind: "scores", params: { week: 1 }, size });

    expect(state.map((w) => w.id)).toEqual(["scores:1", "scores:2"]);
  });

  it("keeps a window's identity when its tab changes, and drops a cleared param", () => {
    let state = desktopReducer([], { type: "open", kind: "team", params: { rosterId: 6 }, size });
    state = desktopReducer(state, { type: "patch", id: "team:6", params: { tab: "roster" } });
    expect(state[0]).toMatchObject({ id: "team:6", params: { rosterId: 6, tab: "roster" } });
    expect(viewKey("team", state[0].params)).toBe("team:6");

    state = desktopReducer(state, { type: "open", kind: "team", params: { rosterId: 6 }, size });
    expect(state).toHaveLength(1);
    state = desktopReducer(state, { type: "patch", id: "team:6", params: { tab: "" } });
    expect(state[0].params).toEqual({ rosterId: 6 });
  });

  it("closes, moves and resizes", () => {
    let state = desktopReducer(openAll("scores", "standings"), { type: "close", id: "standings" });
    state = desktopReducer(state, { type: "move", id: "scores", x: 50, y: 60 });
    state = desktopReducer(state, { type: "resize", id: "scores", w: 500, h: 420 });
    expect(state).toEqual([expect.objectContaining({ id: "scores", x: 50, y: 60, w: 500, h: 420 })]);
  });

  it("brings a focused window to the top, and leaves state alone if it already is", () => {
    const state = desktopReducer(openAll("scores", "standings", "rules"), { type: "focus", id: "scores" });
    expect(activeWindow(state)?.id).toBe("scores");
    expect(desktopReducer(state, { type: "focus", id: "scores" })).toBe(state);
  });

  it("minimizes, and the next window down becomes active", () => {
    const state = desktopReducer(openAll("scores", "standings"), { type: "minimize", id: "standings" });
    expect(byKind(state, "standings").minimized).toBe(true);
    expect(activeWindow(state)?.id).toBe("scores");
  });

  it("maximizes and restores, focusing the window", () => {
    let state = desktopReducer(openAll("scores", "standings"), { type: "toggleMaximize", id: "scores" });
    expect(byKind(state, "scores").maximized).toBe(true);
    expect(activeWindow(state)?.id).toBe("scores");
    state = desktopReducer(state, { type: "toggleMaximize", id: "scores" });
    expect(byKind(state, "scores").maximized).toBe(false);
  });
});

describe("window history", () => {
  const nav = (state: WindowState[], kind: string, params: WindowParams) =>
    desktopReducer(state, { type: "navigate", id: "standings", kind, params });

  it("goes back and forward, and stops at the ends", () => {
    let state = nav(openAll("standings"), "team", { rosterId: 6 });

    state = desktopReducer(state, { type: "back", id: "standings" });
    expect(state[0]).toMatchObject({ kind: "standings", params: {} });
    expect(desktopReducer(state, { type: "back", id: "standings" })).toBe(state);

    state = desktopReducer(state, { type: "forward", id: "standings" });
    expect(state[0]).toMatchObject({ kind: "team", params: { rosterId: 6 } });
    expect(desktopReducer(state, { type: "forward", id: "standings" })).toBe(state);
  });

  it("drops forward entries when navigating from the middle", () => {
    let state = nav(nav(openAll("standings"), "team", { rosterId: 6 }), "player", { playerId: "8121" });
    state = desktopReducer(desktopReducer(state, { type: "back", id: "standings" }), { type: "back", id: "standings" });
    state = nav(state, "week", { week: 1 });

    expect(historyOf(state[0]).views.map((v) => v.kind)).toEqual(["standings", "week"]);
  });

  it("opens a fresh window when the one with that id has navigated elsewhere", () => {
    let state = nav(openAll("standings"), "team", { rosterId: 6 });
    state = desktopReducer(state, { type: "open", kind: "standings", params: {}, size });

    expect(new Set(state.map((w) => w.id)).size).toBe(2);
    expect(activeWindow(state)?.kind).toBe("standings");
  });
});

describe("defaultLayout", () => {
  const overlaps = (a: WindowState, b: WindowState) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

  it.each([
    [1280, 800],
    [1440, 900],
    [1920, 1080],
  ])("tiles Home, Standings and Scores at %ix%i with Home in front and nothing overlapping", (vw, vh) => {
    const state = defaultLayout(vw, vh);
    expect(state.map((w) => w.kind)).toEqual(["standings", "scores", "home"]);
    expect(activeWindow(state)?.kind).toBe("home");
    for (const w of state) {
      expect(w.x + w.w).toBeLessThanOrEqual(vw);
      expect(w.y + w.h).toBeLessThanOrEqual(vh - TASKBAR_HEIGHT);
      expect(w.w).toBeGreaterThanOrEqual(500);
    }
    expect(state.some((a) => state.some((b) => a !== b && overlaps(a, b)))).toBe(false);
  });

  it("opens Home alone on a smaller screen, sized to fit", () => {
    const [home, ...rest] = defaultLayout(1024, 700);
    expect(rest).toEqual([]);
    expect(home).toMatchObject({ kind: "home", w: 760, h: 700 - TASKBAR_HEIGHT });
  });
});
