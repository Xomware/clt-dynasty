import { describe, expect, it } from "vitest";

import { fixture } from "@/lib/test/league-mock";
import type { SleeperGame } from "@/lib/sleeper/types";
import { byeWeek, fantasyWeek, heightLabel, nflGame, rosterSpot, statLine } from "./season";

describe("fantasy weeks", () => {
  const week1 = fixture.matchups["1"];
  const team = week1[0];
  const starter = team.starters!.find((id) => id !== "0")!;
  const benched = team.players!.find((id) => !team.starters!.includes(id))!;

  it("finds the roster, the points and the opponent", () => {
    const week = fantasyWeek(week1, starter)!;
    expect(week.rosterId).toBe(team.roster_id);
    expect(week.points).toBe(team.players_points![starter]);
    expect(week.started).toBe(true);
    const them = week1.find((r) => r.matchup_id === team.matchup_id && r.roster_id !== team.roster_id)!;
    expect(week.opponent).toBe(them.roster_id);
  });

  it("marks a bench week and skips a player nobody rostered", () => {
    expect(fantasyWeek(week1, benched)?.started).toBe(false);
    expect(fantasyWeek(week1, "nobody")).toBeNull();
  });
});

describe("roster spot", () => {
  const roster = { ...fixture.rosters[0], starters: ["a"], players: ["a", "b", "c", "d"], taxi: ["c"], reserve: ["d"] };

  it("names the slot he sits in now", () => {
    expect(rosterSpot([roster], "a")).toEqual({ rosterId: roster.roster_id, slot: "Starter" });
    expect(rosterSpot([roster], "b")?.slot).toBe("Bench");
    expect(rosterSpot([roster], "c")?.slot).toBe("Taxi squad");
    expect(rosterSpot([roster], "d")?.slot).toBe("Injured reserve");
    expect(rosterSpot([roster], "e")).toBeNull();
  });
});

describe("schedule", () => {
  // Real 2026 rows: LAC's bye is week 7, and one canceled game was replayed.
  const schedule: SleeperGame[] = [
    { week: 1, home: "LAC", away: "ARI", status: "complete" },
    { week: 1, home: "KC", away: "DEN", status: "complete" },
    { week: 2, home: "LV", away: "LAC", status: "complete" },
    { week: 2, home: "KC", away: "DEN", status: "canceled" },
    { week: 7, home: "KC", away: "DEN", status: "pre_game" },
  ];

  it("reads home and away", () => {
    expect(nflGame(schedule, "LAC", 1)).toEqual({ opponent: "ARI", home: true });
    expect(nflGame(schedule, "LAC", 2)).toEqual({ opponent: "LV", home: false });
  });

  it("finds the bye, and ignores a canceled game", () => {
    expect(nflGame(schedule, "LAC", 7)).toBe("bye");
    expect(nflGame(schedule, "KC", 2)).toBe("bye");
    expect(nflGame(schedule, "LAC", 9)).toBeNull();
    expect(byeWeek(schedule, "LAC")).toBe(7);
    expect(byeWeek(schedule, "KC")).toBe(2);
  });
});

describe("stat lines", () => {
  it("leads with the position's own numbers", () => {
    // Josh Allen, 2026 week 1.
    const qb = { pass_att: 29, pass_cmp: 20, pass_yd: 334, pass_td: 1, rush_att: 6, rush_yd: 23, rush_td: 2, gp: 1 };
    expect(statLine("QB", qb)).toBe("20/29 passing, 334 yds, 1 TD; 6 car, 23 yds, 2 TD");
    expect(statLine("WR", { rec: 6, rec_tgt: 9, rec_yd: 88, rush_att: 1, rush_yd: -2, gp: 1 })).toBe("6/9 rec, 88 yds; 1 car, -2 yds");
    expect(statLine("RB", { rush_att: 18, rush_yd: 97, fum_lost: 1, gp: 1 })).toBe("18 car, 97 yds; 1 fum lost");
    expect(statLine("K", { fga: 3, fgm: 2, xpa: 4, xpm: 4, gp: 1 })).toBe("2/3 FG, 4/4 XP");
  });

  it("says when he played without a touch", () => {
    expect(statLine("TE", { gp: 1, off_snp: 12 })).toBe("No touches");
    expect(statLine("TE", {})).toBe("Did not play");
  });

  it("converts inches", () => {
    expect(heightLabel("77")).toBe(`6'5"`);
    expect(heightLabel("72")).toBe(`6'0"`);
    expect(heightLabel(`6'2"`)).toBe(`6'2"`);
  });
});
