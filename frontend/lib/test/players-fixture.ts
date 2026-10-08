import type { PlayerWeek } from "@/lib/home/projections";
import type { SleeperRoster } from "@/lib/sleeper/types";

// A made-up week for the Players page's math, keyed by roster_id like the league fixture.
// CLT's starting slots.
export const SLOTS = ["QB", "RB", "RB", "WR", "WR", "TE", "FLEX", "FLEX", "SUPER_FLEX"];

// id -> [position, projected points, FantasyCalc value, locked]
export const POOL: Record<string, [string, number, number, boolean?]> = {
  // Roster 4's starters, slot order; the QB's game has kicked off.
  qb1: ["QB", 21.2, 9000, true], rb1: ["RB", 15.1, 6000], rb2: ["RB", 9.4, 2000], wr1: ["WR", 17.8, 7000], wr2: ["WR", 12.0, 3000],
  te1: ["TE", 10.3, 2500], fx1: ["WR", 8.4, 1200], fx2: ["RB", 11.0, 2600], sf1: ["RB", 7.9, 900],
  // Roster 4's bench, taxi rookie and IR tight end.
  bnWr: ["WR", 5.0, 800], bnRb: ["RB", 4.0, 300], txWr: ["WR", 0, 2000], irTe: ["TE", 0, 1000],
  // Free agents.
  faWr: ["WR", 12.1, 500], faRb: ["RB", 6.0, 200], faRb2: ["RB", 6.0, 1500], faTe: ["TE", 0, 3000], faK: ["K", 9.0, 50], faLate: ["WR", 20.0, 1500, true],
};

export const week = (id: string): PlayerWeek => {
  const [position, points, , locked] = POOL[id] ?? ["", 0, 0];
  return { points, position, positions: [position], team: "CAR", injury: null, bye: false, locked: locked ?? false };
};
export const value = (id: string) => POOL[id]?.[2] ?? 0;

export const ROSTER_4: SleeperRoster = {
  roster_id: 4,
  owner_id: "u4",
  co_owners: null,
  starters: ["qb1", "rb1", "rb2", "wr1", "wr2", "te1", "fx1", "fx2", "sf1"],
  players: ["qb1", "rb1", "rb2", "wr1", "wr2", "te1", "fx1", "fx2", "sf1", "bnWr", "bnRb", "txWr", "irTe"],
  taxi: ["txWr"],
  reserve: ["irTe"],
  settings: { wins: 0, losses: 0, ties: 0, fpts: 0 },
  metadata: null,
};

