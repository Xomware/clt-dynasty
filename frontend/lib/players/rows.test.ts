import { describe, expect, it } from "vitest";

import type { Player } from "@/lib/api/players";
import type { SleeperRoster } from "@/lib/sleeper/types";
import { DEFAULT_VIEW, type View } from "./params";
import { buildRows, filterRows, sortRows } from "./rows";

const p = (player_id: string, position: string, extra: Partial<Player> = {}): Player => ({ player_id, position, first_name: player_id, team: "CAR", ...extra });

const PLAYERS: Record<string, Player> = {
  qb1: p("qb1", "QB", { age: 29, years_exp: 7 }),
  rb1: p("rb1", "RB", { age: 22, years_exp: 0, injury_status: "Questionable" }),
  rb2: p("rb2", "RB", { age: 27, years_exp: 5, team: undefined }),
  wr1: p("wr1", "WR", { age: 24, years_exp: 2, injury_status: "IR" }),
  te1: p("te1", "TE", { age: 31, years_exp: 9 }),
  k1: p("k1", "K", { age: 35 }),
  dst: p("CAR", "DEF"),
};

const roster = (roster_id: number, players: string[], extra: Partial<SleeperRoster> = {}): SleeperRoster => ({
  roster_id,
  owner_id: `u${roster_id}`,
  co_owners: null,
  starters: [],
  players,
  taxi: null,
  reserve: null,
  settings: { wins: 0, losses: 0, ties: 0, fpts: 0 },
  metadata: null,
  ...extra,
});

// Roster 4 is mine: a starter, a taxi rookie and an IR receiver. Roster 9 has the TE.
const ROSTERS = [roster(4, ["qb1", "rb1", "wr1"], { taxi: ["rb1"], reserve: ["wr1"] }), roster(9, ["te1"])];
const SEASON: Record<string, { points: number; rank: number; games: number }> = {
  qb1: { points: 101.4, rank: 3, games: 4 },
  te1: { points: 60, rank: 1, games: 4 },
  rb2: { points: 33, rank: 20, games: 3 },
};
const VALUES: Record<string, number> = { qb1: 7000, rb1: 4000, wr1: 3000, te1: 2500, rb2: 900 };

const rows = buildRows({
  players: PLAYERS,
  rosters: ROSTERS,
  season: (id) => SEASON[id] ?? null,
  proj: (id) => ({ qb1: 20.5, te1: 9.1, rb2: 6 })[id] ?? 0,
  ros: null,
  value: (id) => VALUES[id] ?? 0,
});
const ids = (view: Partial<View>, mine: number | null = 4) => filterRows(rows, { ...DEFAULT_VIEW, ...view }, mine, null).map((r) => r.id).sort();

describe("player rows", () => {
  it("lists the fantasy positions with owner, roster spot and per-game points", () => {
    expect(rows.map((r) => r.id).sort()).toEqual(["k1", "qb1", "rb1", "rb2", "te1", "wr1"]);
    const qb = rows.find((r) => r.id === "qb1");
    expect(qb).toMatchObject({ owner: 4, slot: "active", pts: 101.4, ppg: 25.4, rank: 3, proj: 20.5, value: 7000 });
    expect(rows.find((r) => r.id === "rb1")).toMatchObject({ owner: 4, slot: "taxi", rookie: true, pts: null, ppg: null });
    expect(rows.find((r) => r.id === "rb2")).toMatchObject({ owner: null, slot: null, team: null, ppg: 11 });
  });

  it("filters by owner: available is on no CLT roster, mine is my roster, a number is that team", () => {
    expect(ids({ owner: "available" })).toEqual(["k1", "rb2"]);
    expect(ids({ owner: "mine" })).toEqual(["qb1", "rb1", "wr1"]);
    expect(ids({ owner: "mine" }, null)).toEqual([]);
    expect(ids({ owner: 9 })).toEqual(["te1"]);
  });

  it("filters by roster spot, injury, rookies, NFL team and age", () => {
    expect(ids({ slot: "taxi" })).toEqual(["rb1"]);
    expect(ids({ slot: "ir" })).toEqual(["wr1"]);
    expect(ids({ health: "questionable" })).toEqual(["rb1"]);
    expect(ids({ health: "out" })).toEqual(["wr1"]);
    expect(ids({ health: "healthy" })).toEqual(["k1", "qb1", "rb2", "te1"]);
    expect(ids({ rookies: true })).toEqual(["rb1"]);
    expect(ids({ nfl: "FA" })).toEqual(["rb2"]);
    expect(ids({ pos: ["RB", "TE"], ageMin: 23, ageMax: 30 })).toEqual(["rb2"]);
  });

  it("sorts best first with blanks last either way, ties to dynasty value", () => {
    expect(sortRows(rows, "pts", true).map((r) => r.id)).toEqual(["qb1", "te1", "rb2", "rb1", "wr1", "k1"]);
    expect(sortRows(rows, "pts", false).map((r) => r.id)).toEqual(["rb2", "te1", "qb1", "rb1", "wr1", "k1"]);
    expect(sortRows(rows, "age", false).map((r) => r.id)).toEqual(["rb1", "wr1", "rb2", "qb1", "te1", "k1"]);
  });
});
