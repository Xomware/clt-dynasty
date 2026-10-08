import { describe, expect, it } from "vitest";

import type { Player } from "@/lib/api/players";
import { formation } from "./formation";

const p = (player_id: string, position: string, depth_chart_order?: number, depth_chart_position?: string, team = "LAC"): Player => ({
  player_id,
  position,
  team,
  depth_chart_order,
  depth_chart_position,
});

// LAC's 2026 chart from Sleeper: receivers ranked 1-9 across three slots.
const LAC = [
  p("herbert", "QB", 1, "QB"),
  p("lance", "QB", 2, "QB"),
  p("hampton", "RB", 1, "RB"),
  p("mitchell", "RB", 2, "RB"),
  p("mcconkey", "WR", 1, "SWR"),
  p("johnston", "WR", 2, "LWR"),
  p("harris", "WR", 3, "RWR"),
  p("mvs", "WR", 4, "LWR"),
  p("thompson", "WR", 5, "RWR"),
  p("davis", "WR", 6, "SWR"),
  p("gadsden", "TE", 1, "TE"),
  p("dicker", "K", 1, "K"),
  p("practice", "WR", undefined),
  p("allen", "QB", 1, "QB", "BUF"),
];
const map = (players: Player[]) => Object.fromEntries(players.map((x) => [x.player_id, x]));
const slots = (players: Player[]) => Object.fromEntries(formation(map(players), "LAC").map((s) => [s.id, s.players.map((x) => x.player_id)]));

describe("formation", () => {
  it("puts receivers in Sleeper's slots, starter first, and everyone else at his position", () => {
    expect(slots(LAC)).toEqual({
      X: ["johnston", "mvs"],
      TE: ["gadsden"],
      Z: ["harris", "thompson"],
      QB: ["herbert", "lance"],
      SLOT: ["mcconkey", "davis"],
      RB: ["hampton", "mitchell"],
      K: ["dicker"],
    });
  });

  it("deals receivers out X, Z, slot by chart order when the slot is missing", () => {
    const old = LAC.map((x) => ({ ...x, depth_chart_position: undefined }));
    expect(slots(old)).toMatchObject({ X: ["mcconkey", "mvs"], Z: ["johnston", "thompson"], SLOT: ["harris", "davis"] });
  });

  it("drops a spot nobody is charted at", () => {
    const ids = formation(map(LAC.filter((x) => x.position !== "K" && x.position !== "TE")), "LAC").map((s) => s.id);
    expect(ids).toEqual(["X", "Z", "QB", "SLOT", "RB"]);
    expect(formation(map(LAC), "NYJ")).toEqual([]);
  });
});
