import { describe, expect, it } from "vitest";

import type { Player } from "@/lib/api/players";
import { firstDirection, rosterRows, sortRows } from "./roster";
import type { PlayerRanks } from "./use-ranks";

const p = (player_id: string, position: string, depth_chart_order?: number): Player => ({ player_id, first_name: player_id, position, team: "LAC", depth_chart_order });
const PLAYERS = Object.fromEntries([p("wr2", "WR", 2), p("qb1", "QB", 1), p("wr1", "WR", 1), p("wr-off", "WR"), p("te1", "TE", 1)].map((x) => [x.player_id, x]));

const NONE: PlayerRanks = { season: null, projected: null, dynasty: null };
const RANKS: Record<string, PlayerRanks> = {
  qb1: { ...NONE, season: { points: 90, rank: 12, position: "QB" }, dynasty: { value: 7000, overall: 20, rank: 9, position: "QB" } },
  wr1: { ...NONE, season: { points: 70, rank: 20, position: "WR" }, projected: { points: 14, rank: 18, position: "WR" } },
  wr2: { ...NONE, season: { points: 95, rank: 8, position: "WR" }, dynasty: { value: 9000, overall: 5, rank: 3, position: "WR" } },
};
const rows = rosterRows(PLAYERS, "LAC", (id) => RANKS[id] ?? NONE);
const ids = (key: Parameters<typeof sortRows>[1], dir: "asc" | "desc") => sortRows(rows, key, dir).map((r) => r.player.player_id);

describe("NFL roster table", () => {
  it("defaults to position order, chart order within it, the off-chart last", () => {
    expect(rows.map((r) => [r.player.player_id, r.depth])).toEqual([
      ["qb1", 1],
      ["wr1", 1],
      ["wr2", 2],
      ["wr-off", null],
      ["te1", 1],
    ]);
  });

  it("sorts points high-first and ranks low-first, with the unranked last either way", () => {
    expect(firstDirection("season")).toBe("desc");
    expect(firstDirection("seasonRank")).toBe("asc");
    expect(ids("season", "desc")).toEqual(["wr2", "qb1", "wr1", "wr-off", "te1"]);
    expect(ids("season", "asc")).toEqual(["wr1", "qb1", "wr2", "wr-off", "te1"]);
    expect(ids("dynastyRank", "asc")).toEqual(["wr2", "qb1", "wr1", "wr-off", "te1"]);
    expect(ids("proj", "desc")).toEqual(["wr1", "qb1", "wr2", "wr-off", "te1"]);
  });

  it("sorts by name", () => {
    expect(ids("name", "asc")).toEqual(["qb1", "te1", "wr-off", "wr1", "wr2"]);
  });
});
