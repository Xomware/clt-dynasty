import { describe, expect, it } from "vitest";

import type { SleeperGame, SleeperProjection } from "@/lib/sleeper/types";
import { checkLineup } from "./lineup";
import { type PlayerWeek, scoreProjection, weekBoard } from "./projections";

// CLT's starting slots.
const SLOTS = ["QB", "RB", "RB", "WR", "WR", "TE", "FLEX", "FLEX", "SUPER_FLEX"];

const healthy = { team: "CHA", injury: null, bye: false, locked: false };
const board = (players: Record<string, Partial<PlayerWeek> & { position: string; points: number }>) => (id: string): PlayerWeek => {
  const p = players[id] ?? { position: "", points: 0 };
  return { ...healthy, positions: [p.position], ...p };
};

// Roster 4's week: one starter at every slot, a bench to swap from.
const ROSTER_4 = {
  qb1: { position: "QB", points: 21.2 },
  rb1: { position: "RB", points: 15.1 },
  rb2: { position: "RB", points: 9.4 },
  wr1: { position: "WR", points: 17.8 },
  wr2: { position: "WR", points: 12.0 },
  te1: { position: "TE", points: 10.3 },
  fx1: { position: "WR", points: 8.4 },
  fx2: { position: "RB", points: 11.0 },
  sf1: { position: "RB", points: 7.9 },
};
const STARTERS_4 = Object.keys(ROSTER_4);

describe("lineup check", () => {
  it("finds nothing to do when every starter beats the bench player who could replace him", () => {
    const week = board({ ...ROSTER_4, bn1: { position: "WR", points: 6.0 }, bn2: { position: "QB", points: 5.1 } });
    const check = checkLineup(SLOTS, STARTERS_4, ["bn1", "bn2"], week);
    expect(check.swaps).toEqual([]);
    expect(check.starters.every((s) => s.flags.length === 0)).toBe(true);
    expect(check.projected).toBe(113.1);
    expect(check.best).toBe(113.1);
  });

  it("swaps the weakest starter a bench receiver can replace", () => {
    const week = board({ ...ROSTER_4, bn1: { position: "WR", points: 12.1 } });
    const check = checkLineup(SLOTS, STARTERS_4, ["bn1"], week);
    expect(check.swaps).toEqual([{ slot: "SUPER_FLEX", out: "sf1", outPoints: 7.9, in: "bn1", inPoints: 12.1 }]);
    // The 7.9 superflex RB goes, not the 8.4 FLEX WR.
    expect(check.starters.find((s) => s.id === "sf1")?.flags).toEqual(["outscored"]);
    expect(check.best - check.projected).toBeCloseTo(4.2);
  });

  it("starts a second QB only at SUPER_FLEX, never at FLEX", () => {
    const week = board({ ...ROSTER_4, sf1: { position: "WR", points: 13.0 }, fx1: { position: "WR", points: 6.0 }, qb2: { position: "QB", points: 18.5 } });
    const check = checkLineup(SLOTS, STARTERS_4, ["qb2"], week);
    // The 6.0 FLEX WR is the weakest starter, but a QB can't play FLEX: the
    // QB takes SUPER_FLEX and its WR slides down into FLEX.
    expect(check.swaps).toEqual([{ slot: "SUPER_FLEX", out: "fx1", outPoints: 6.0, in: "qb2", inPoints: 18.5, move: { id: "sf1", to: "FLEX" } }]);
    expect(check.best).toBeCloseTo(check.projected + 12.5);
  });

  it("flags starters who are out or on bye and starts healthy players instead", () => {
    const week = board({
      ...ROSTER_4,
      rb1: { position: "RB", points: 0, injury: "Out" },
      wr2: { position: "WR", points: 0, bye: true, team: "KC" },
      bn1: { position: "RB", points: 4.2 },
      bn2: { position: "WR", points: 3.1 },
    });
    const check = checkLineup(SLOTS, STARTERS_4, ["bn1", "bn2"], week);
    expect(check.starters.find((s) => s.id === "rb1")?.flags).toEqual(["out", "outscored"]);
    expect(check.starters.find((s) => s.id === "wr2")?.flags).toEqual(["bye", "outscored"]);
    expect(check.swaps.map((s) => [s.out, s.in])).toEqual([
      ["rb1", "bn1"],
      ["wr2", "bn2"],
    ]);
  });

  it("keeps an injured starter flagged when nobody on the bench can play his slot", () => {
    const week = board({ ...ROSTER_4, te1: { position: "TE", points: 0, injury: "IR" }, bn1: { position: "QB", points: 2 } });
    const check = checkLineup(SLOTS, STARTERS_4, ["bn1"], week);
    expect(check.swaps).toEqual([]);
    expect(check.starters.find((s) => s.slot === "TE")?.flags).toEqual(["out"]);
  });

  it("marks a doubtful starter without benching him for a lower projection", () => {
    const week = board({ ...ROSTER_4, wr1: { position: "WR", points: 14.0, injury: "Doubtful" }, bn1: { position: "WR", points: 5.0 } });
    expect(checkLineup(SLOTS, STARTERS_4, ["bn1"], week).starters.find((s) => s.id === "wr1")?.flags).toEqual(["doubtful"]);
  });

  it("starts a two-way player at any position Sleeper lists for him", () => {
    const week = board({ ...ROSTER_4, bn1: { position: "DB", positions: ["DB", "WR"], points: 9.9 } });
    expect(checkLineup(SLOTS, STARTERS_4, ["bn1"], week).swaps).toEqual([{ slot: "SUPER_FLEX", out: "sf1", outPoints: 7.9, in: "bn1", inPoints: 9.9 }]);
  });

  it("fills an empty slot from the bench", () => {
    const starters = STARTERS_4.map((id) => (id === "fx2" ? "0" : id));
    const week = board({ ...ROSTER_4, bn1: { position: "TE", points: 6.6 } });
    const check = checkLineup(SLOTS, starters, ["bn1"], week);
    expect(check.starters[7]).toEqual({ slot: "FLEX", id: null, points: 0, flags: ["empty"] });
    expect(check.swaps).toEqual([{ slot: "FLEX", out: null, outPoints: 0, in: "bn1", inPoints: 6.6 }]);
  });

  it("never moves a player whose game has kicked off", () => {
    const week = board({ ...ROSTER_4, sf1: { position: "RB", points: 7.9, locked: true }, bn1: { position: "RB", points: 20, locked: true }, bn2: { position: "RB", points: 9 } });
    const check = checkLineup(SLOTS, STARTERS_4, ["bn1", "bn2"], week);
    expect(check.swaps).toEqual([{ slot: "FLEX", out: "fx1", outPoints: 8.4, in: "bn2", inPoints: 9 }]);
  });
});

describe("projected points", () => {
  const scoring = { rec: 1, rec_yd: 0.1, rec_td: 6, bonus_rec_te: 0.5, pass_yd: 0.04 };

  it("scores the projected line with the league's settings, TE premium included", () => {
    expect(scoreProjection({ rec: 6, rec_yd: 70, rec_td: 0.5, bonus_rec_te: 6, pts_ppr: 16 }, scoring)).toBe(19);
  });

  it("reads byes and kickoffs from the schedule and zeroes players ruled out", () => {
    const rows: SleeperProjection[] = [
      { player_id: "te1", team: "ARI", stats: { rec: 6, bonus_rec_te: 6 }, player: { position: "TE", injury_status: null } },
      { player_id: "wr1", team: "KC", stats: {}, player: { position: "WR", injury_status: null } },
      { player_id: "wr2", team: "DET", stats: { rec: 5 }, player: { position: "WR", injury_status: "Out" } },
      { player_id: "qb1", team: "DAL", stats: { pass_yd: 250 }, player: { position: "QB", injury_status: null } },
    ];
    const games: SleeperGame[] = [
      { week: 5, home: "ARI", away: "DET", status: "pre_game" },
      { week: 5, home: "DAL", away: "TB", status: "in_game" },
      { week: 4, home: "KC", away: "LV", status: "complete" },
    ];
    const week = weekBoard(rows, { rb9: { player_id: "rb9", position: "RB", team: "NYG", injury_status: "Questionable" } }, scoring, games, 5);
    expect(week("te1")).toMatchObject({ points: 9, position: "TE", bye: false, locked: false });
    expect(week("wr1")).toMatchObject({ points: 0, bye: true });
    expect(week("wr2")).toMatchObject({ points: 0, injury: "Out" });
    expect(week("qb1")).toMatchObject({ points: 10, locked: true });
    expect(week("rb9")).toMatchObject({ points: 0, position: "RB", injury: "Questionable", bye: true });
  });
});
