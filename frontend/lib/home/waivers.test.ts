import { describe, expect, it } from "vitest";

import { parseValues } from "@/lib/analyzer/values";
import type { Player } from "@/lib/api/players";
import type { SleeperRoster } from "@/lib/sleeper/types";
import type { PlayerWeek } from "./projections";
import { suggestPickups } from "./waivers";

const SLOTS = ["QB", "RB", "RB", "WR", "WR", "TE", "FLEX", "FLEX", "SUPER_FLEX"];

// id -> [position, FantasyCalc value, projected points]
const POOL: Record<string, [string, number, number]> = {
  // Roster 1: thin at RB, deep at WR.
  qb1: ["QB", 6000, 18], qb1b: ["QB", 3000, 14], rb1: ["RB", 900, 6], rb1b: ["RB", 400, 4],
  wr1: ["WR", 7000, 16], wr1b: ["WR", 5000, 13], wr1c: ["WR", 20, 0], te1: ["TE", 2000, 9],
  // Roster 2: deep at RB.
  qb2: ["QB", 5000, 17], qb2b: ["QB", 2500, 13], rb2: ["RB", 6000, 15], rb2b: ["RB", 5000, 14],
  wr2: ["WR", 3000, 10], wr2b: ["WR", 2500, 9], te2: ["TE", 1500, 8],
  // Roster 1's taxi and IR, never dropped; roster 2's bench.
  tx1: ["RB", 10, 0], ir1: ["WR", 5, 0], bn2: ["WR", 30, 1],
  // Free agents.
  faRb: ["RB", 700, 9], faTe: ["TE", 300, 7], faWr: ["WR", 100, 3], faNothing: ["WR", 0, 0], faDb: ["DB", 400, 5],
};

const players: Record<string, Player> = Object.fromEntries(
  Object.entries(POOL).map(([id, [position]]) => [id, { player_id: id, position, first_name: id }]),
);
const values = parseValues(Object.entries(POOL).map(([id, [position, value]]) => ({ player: { sleeperId: id, position, name: id }, value })));
const week = (id: string): PlayerWeek => {
  const [position, , points] = POOL[id] ?? ["", 0, 0];
  return { points, position, positions: id === "faDb" ? ["DB", "WR"] : [position], team: "CHA", injury: null, bye: false, locked: false };
};

const roster = (roster_id: number, players: string[], starters: string[], extra: Partial<SleeperRoster> = {}): SleeperRoster => ({
  roster_id,
  owner_id: `u${roster_id}`,
  co_owners: null,
  starters,
  players,
  taxi: null,
  reserve: null,
  settings: { wins: 0, losses: 0, ties: 0, fpts: 0 },
  metadata: null,
  ...extra,
});

const ROSTER_1 = roster(1, ["qb1", "qb1b", "rb1", "rb1b", "wr1", "wr1b", "wr1c", "te1", "tx1", "ir1"], ["qb1", "rb1", "rb1b", "wr1", "wr1b", "te1", "qb1b"], {
  taxi: ["tx1"],
  reserve: ["ir1"],
});
const ROSTER_2 = roster(2, ["qb2", "qb2b", "rb2", "rb2b", "wr2", "wr2b", "te2", "bn2"], ["qb2", "rb2", "rb2b", "wr2", "wr2b", "te2", "qb2b"]);
const ROSTERS = [ROSTER_1, ROSTER_2];

const suggest = (rosterId: number, rosterSize: number, rosters = ROSTERS) =>
  suggestPickups({ rosterId, rosters, players, values, week, slots: SLOTS, rosterSize });

describe("waiver suggestions", () => {
  it("leads with the free agent at the team's thinnest position and pairs him with its weakest bench player", () => {
    const [first, ...rest] = suggest(1, 8);
    expect(first.add.id).toBe("faRb");
    expect(first.need).toMatchObject({ position: "RB", valueRank: 2, weekRank: 2, teams: 2 });
    expect(first.drop?.id).toBe("wr1c");
    // One bench player to drop, so one pairing; the others need a drop it can't spare.
    expect(rest).toEqual([]);
  });

  it("fills open roster spots without a drop", () => {
    const picks = suggest(1, 10);
    expect(picks.map((p) => [p.add.id, p.drop?.id ?? null])).toEqual([
      ["faRb", null],
      ["faTe", null],
      ["faDb", "wr1c"],
    ]);
  });

  it("never offers rostered players, taxi or IR drops, or free agents with no value or projection", () => {
    const picks = suggest(1, 10);
    const ids = picks.flatMap((p) => [p.add.id, p.drop?.id]);
    for (const id of ["rb2", "bn2", "tx1", "ir1", "faNothing"]) expect(ids).not.toContain(id);
  });

  it("counts a two-way player at the position a lineup can use", () => {
    expect(suggest(1, 10).find((p) => p.add.id === "faDb")?.add.position).toBe("WR");
  });

  it("won't drop a starter or the last body a position's slots need", () => {
    // Roster 2's only bench player is the WR; every starter is protected.
    expect(suggest(2, 8).every((p) => p.drop === null || p.drop.id === "bn2")).toBe(true);
    const noBench = roster(2, ROSTER_2.players!.filter((id) => id !== "bn2"), ROSTER_2.starters);
    expect(suggest(2, 7, [ROSTER_1, noBench])).toEqual([]);
  });

  it("skips a swap that isn't clearly better", () => {
    const strong = roster(1, [...ROSTER_1.players!.filter((id) => id !== "wr1c"), "bn2"], ROSTER_1.starters, { taxi: ["tx1"], reserve: ["ir1"] });
    const weakBench = roster(2, ROSTER_2.players!.filter((id) => id !== "bn2"), ROSTER_2.starters);
    // bn2 (value 30, 1 point) is worth less than faRb, so it still goes; make it worth more and nothing does.
    expect(suggest(1, 8, [strong, weakBench])[0]?.drop?.id).toBe("bn2");
    const pricey = parseValues(Object.entries({ ...POOL, bn2: ["WR", 3000, 12] as [string, number, number] }).map(([id, [position, value]]) => ({ player: { sleeperId: id, position, name: id }, value })));
    expect(suggestPickups({ rosterId: 1, rosters: [strong, weakBench], players, values: pricey, week, slots: SLOTS, rosterSize: 8 })).toEqual([]);
  });
});
