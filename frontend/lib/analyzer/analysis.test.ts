import { describe, expect, it } from "vitest";

import type { SleeperRoster } from "@/lib/sleeper/types";
import { analyze, leagueShape, standing } from "./analysis";
import { parseValues } from "./values";

const values = parseValues([
  { player: { sleeperId: "qb1", position: "QB", name: "Q" }, value: 9000 },
  { player: { sleeperId: "wr1", position: "WR", name: "W" }, value: 5000 },
  { player: { sleeperId: "wr2", position: "WR", name: "W2" }, value: 3000 },
  { player: { sleeperId: "k1", position: "K", name: "K" }, value: 100 },
  { player: { sleeperId: "tx1", position: "RB", name: "T" }, value: 700 },
  { player: { sleeperId: "ir1", position: "TE", name: "I" }, value: 4000 },
  { player: { sleeperId: null, position: "PICK", name: "2027 1st (Early)" }, value: 6500 },
]);

const roster = (extra: Partial<SleeperRoster> = {}): SleeperRoster => ({
  roster_id: 3,
  owner_id: "u3",
  co_owners: null,
  starters: ["qb1", "wr1", "k1"],
  players: ["qb1", "wr1", "wr2", "k1", "tx1", "ir1", "unvalued"],
  taxi: ["tx1"],
  reserve: ["ir1"],
  settings: { wins: 0, losses: 0, ties: 0, fpts: 0 },
  metadata: null,
  ...extra,
});

describe("team analysis", () => {
  it("buckets starters by position, a starting kicker and the bench into Bench, taxi apart, IR nowhere", () => {
    const t = analyze(roster(), [], { qb1: { player_id: "qb1", position: "QB" } }, values);
    expect(t.axes).toEqual({ QB: 9000, RB: 0, WR: 5000, TE: 0, Bench: 3100, Taxi: 700 });
    expect(t.total).toBe(17800);
    expect(t.name).toBe("Team 3");
  });

  it("keeps picks out of the player values", () => {
    expect(values.picks.get("2027 1st (Early)")).toBe(6500);
    expect(values.players.has("")).toBe(false);
  });

  it("finds the league best and average per axis", () => {
    const a = analyze(roster(), [], {}, values);
    const b = analyze(roster({ roster_id: 4, starters: [], taxi: [] }), [], {}, values);
    const { max, average, averageTotal } = leagueShape([a, b]);
    expect(max.QB).toBe(9000);
    expect(average.QB).toBe(4500);
    expect(b.axes.Bench).toBe(17800);
    expect(averageTotal).toBe(17800);
  });

  it("marks 5% over average as a strength and 15% under as a hole", () => {
    expect(standing(105, 100)).toBe("above");
    expect(standing(104, 100)).toBe("even");
    expect(standing(85, 100)).toBe("below");
    expect(standing(10, 0)).toBe("even");
  });
});
