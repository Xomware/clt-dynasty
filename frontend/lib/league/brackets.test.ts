import { describe, expect, it } from "vitest";

import { fixture, pastFixture } from "@/lib/test/league-mock";
import { finishOrder, fromSleeper, lastFinishedWeek } from "./brackets";
import { playoffSeeds, sortStandings } from "./standings";

const [season2025, season2024] = Object.values(pastFixture);
const seedsOf = (s: { rosters: typeof fixture.rosters }) => playoffSeeds(sortStandings(s.rosters));

describe("fromSleeper", () => {
  it("keeps the championship path and drops the placement games", () => {
    const b = fromSleeper(fixture.winners_bracket, seedsOf(fixture));
    expect(b.rounds.map((r) => r.map((m) => m.id))).toEqual([[1, 2], [3, 4], [6]]);
    expect(b.rounds[0].map((m) => [m.a.rosterId, m.b.rosterId])).toEqual([
      [12, 7],
      [11, 5],
    ]);
  });

  it("seeds each slot and finds the round-1 byes", () => {
    const b = fromSleeper(fixture.winners_bracket, seedsOf(fixture));
    expect(b.byes.map((s) => [s.rosterId, s.seed])).toEqual([
      [2, 1],
      [4, 2],
    ]);
    expect(b.rounds[0][0].a.seed).toBe(4);
    expect(b.rounds[1][0].b).toEqual({ rosterId: null, seed: null, from: "Winner of game 1" });
  });
});

describe("finishOrder", () => {
  it("ranks a finished season: final, then each round's losers by seed", () => {
    expect(finishOrder(fromSleeper(season2025.winners_bracket, seedsOf(season2025)), seedsOf(season2025))).toEqual([
      10, 4, 3, 11, 5, 7,
    ]);
    expect(finishOrder(fromSleeper(season2024.winners_bracket, seedsOf(season2024)), seedsOf(season2024))).toEqual([
      2, 11, 1, 3, 10, 4,
    ]);
  });

  it("matches the champion Sleeper recorded", () => {
    const [champion] = finishOrder(fromSleeper(season2025.winners_bracket, seedsOf(season2025)), seedsOf(season2025))!;
    expect(String(champion)).toBe(fixture.league.metadata?.latest_league_winner_roster_id);
  });

  it("is null before the final is played", () => {
    expect(finishOrder(fromSleeper(fixture.winners_bracket, seedsOf(fixture)), seedsOf(fixture))).toBeNull();
  });
});

describe("lastFinishedWeek", () => {
  it("is the week before Sleeper's in season, and everything once the season moves on", () => {
    expect(lastFinishedWeek(fixture.state, "2026")).toBe(3);
    expect(lastFinishedWeek(fixture.state, "2025")).toBe(Infinity);
    expect(lastFinishedWeek({ ...fixture.state, season_type: "pre" }, "2026")).toBe(0);
  });
});
