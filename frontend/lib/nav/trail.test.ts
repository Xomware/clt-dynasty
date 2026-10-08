import { describe, expect, it } from "vitest";

import { kind } from "@/lib/test/test-windows";
import { firstEntry, nextEntry, readEntry, type Stop } from "./trail";

const stop = (k: string, depth: number, params = {}): Stop => ({ view: { kind: kind(k), params }, label: k, depth });

describe("nextEntry", () => {
  const start = firstEntry("league");

  it("adds the page left to the path on a drill, and remembers it for Back", () => {
    const a = nextEntry(start, stop("scores", 0), { kind: "team", params: { rosterId: 4 } }, "league", true);
    const b = nextEntry(a, stop("team", 1, { rosterId: 4 }), { kind: "player", params: { playerId: "1" } }, "league", true);
    expect(b.depth).toBe(2);
    expect(b.trail.map((s) => s.view.kind)).toEqual(["scores", "team"]);
    expect(b.prev?.view.kind).toBe("team");
    expect(b.scrollY).toBe(0);
  });

  it("starts a new path on a jump from the nav, still knowing the page left", () => {
    const a = nextEntry(start, stop("scores", 0), { kind: "team", params: { rosterId: 4 } }, "league", true);
    const b = nextEntry(a, stop("team", 1, { rosterId: 4 }), { kind: "history", params: {} }, "history", false);
    expect(b.trail).toEqual([]);
    expect(b.prev?.view.kind).toBe("team");
    expect(b.group).toBe("history");
  });

  it("cuts the loop when a drill comes back to a page already on the path", () => {
    let e = start;
    e = nextEntry(e, stop("team", 0, { rosterId: 4 }), { kind: "player", params: { playerId: "1" } }, null, true);
    e = nextEntry(e, stop("player", 1, { playerId: "1" }), { kind: "nfl", params: { team: "SEA" } }, null, true);
    e = nextEntry(e, stop("nfl", 2, { team: "SEA" }), { kind: "team", params: { rosterId: 4, tab: "picks" } }, null, true);
    expect(e.trail).toEqual([]);
    expect(e.depth).toBe(3);
  });

  it("keeps the last eight stops of a long path", () => {
    let e = start;
    for (let i = 0; i < 12; i++)
      e = nextEntry(e, stop("player", i, { playerId: String(i) }), { kind: "player", params: { playerId: String(i + 1) } }, null, true);
    expect(e.trail).toHaveLength(8);
    expect(e.trail[0].depth).toBe(4);
  });
});

describe("readEntry", () => {
  it("reads ours beside Next's own history state, and nothing else", () => {
    const entry = firstEntry(null);
    expect(readEntry({ __NA: true, clt: entry })).toEqual(entry);
    expect(readEntry({ __NA: true })).toBeNull();
    expect(readEntry(null)).toBeNull();
  });
});
