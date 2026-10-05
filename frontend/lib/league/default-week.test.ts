import { describe, expect, it } from "vitest";

import { fixture } from "@/lib/test/league-mock";
import type { SleeperMatchup } from "@/lib/sleeper/types";
import { defaultWeek, lastLeagueWeek, leagueWeek } from "./default-week";

const league = fixture.league;
const nfl = fixture.state;
const rows = (points: number[]) => points.map((p, i) => ({ roster_id: i + 1, matchup_id: 1, points: p }) as SleeperMatchup);

describe("leagueWeek", () => {
  it("follows Sleeper's week in season", () => {
    expect(leagueWeek(league, nfl)).toBe(4);
  });

  it("stops at the final playoff week, and sits there once the league is complete", () => {
    expect(lastLeagueWeek(league)).toBe(17);
    expect(leagueWeek(league, { ...nfl, week: 18 })).toBe(17);
    expect(leagueWeek({ ...league, status: "complete" }, { ...nfl, week: 1, season_type: "off" })).toBe(17);
  });

  it("starts at week 1 before the season", () => {
    expect(leagueWeek(league, { ...nfl, week: 0, season_type: "pre" })).toBe(1);
  });
});

describe("defaultWeek", () => {
  it("shows the new week once anybody has scored in it", () => {
    expect(defaultWeek(4, rows([0, 12.5]))).toBe(4);
  });

  it("stays on the week that just ended until then", () => {
    expect(defaultWeek(4, rows([0, 0]))).toBe(3);
    expect(defaultWeek(4, [])).toBe(3);
    expect(defaultWeek(1, rows([0, 0]))).toBe(1);
  });
});
