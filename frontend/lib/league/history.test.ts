import { afterEach, describe, expect, it, vi } from "vitest";

import { fixture, pastFixture, stubSleeper } from "@/lib/test/league-mock";
import { headToHead, leagueChain, loadHistory, seasonGames } from "./history";

const [season2025] = Object.values(pastFixture);

afterEach(() => {
  vi.restoreAllMocks();
});

describe("leagueChain", () => {
  it("walks previous_league_id back to the first season", async () => {
    stubSleeper();
    expect((await leagueChain()).map((l) => l.season)).toEqual(["2026", "2025", "2024"]);
  });
});

describe("seasonGames", () => {
  const weeks = Object.values(season2025.matchups);
  const games = seasonGames(season2025.league, weeks, season2025.winners_bracket);

  it("keeps six games a week in the regular season", () => {
    expect(games.filter((g) => g.kind === "regular")).toHaveLength(14 * 6);
  });

  it("tells the bracket's games from Sleeper's consolation pairings", () => {
    const playoff = games.filter((g) => g.kind === "playoff").map((g) => [g.week, ...g.sides.map((s) => s.rosterId).sort((a, b) => a - b)]);
    expect(playoff).toEqual([
      [15, 5, 11],
      [15, 3, 7],
      [16, 10, 11],
      [16, 3, 4],
      [17, 4, 10],
    ]);
    expect(games.filter((g) => g.week === 15 && g.kind === "consolation")).toHaveLength(2);
  });
});

describe("loadHistory", () => {
  it("loads every season, with only the current season's finished weeks", async () => {
    stubSleeper();
    const seasons = await loadHistory();
    expect(seasons.map((s) => [s.league.season, s.finish?.[0] ?? null])).toEqual([
      ["2026", null],
      ["2025", 10],
      ["2024", 2],
    ]);
    // Week 4 is still being played.
    expect(Math.max(...seasons[0].games.map((g) => g.week))).toBe(3);
  });
});

describe("headToHead", () => {
  it("totals a roster's record against each opponent across seasons", async () => {
    stubSleeper();
    const games = (await loadHistory()).flatMap((s) => s.games);
    const rows = headToHead(games, 4);
    const by = Object.fromEntries(rows.map((r) => [r.opponent, [r.wins, r.losses, r.ties]]));
    // Checked against a separate script over the same data. The old site's
    // rules (every week 1-17, consolation pairings and the unfinished week 4
    // counted) differ only there: 3-0 v 6, 1-2 v 2, 2-1 v 9, 1-3 v 10.
    expect(by).toEqual({
      1: [4, 2, 0],
      2: [1, 1, 0],
      3: [3, 0, 0],
      5: [1, 1, 0],
      6: [2, 0, 0],
      7: [3, 2, 0],
      8: [4, 1, 0],
      9: [1, 1, 0],
      10: [0, 3, 0],
      11: [1, 1, 0],
      12: [1, 1, 0],
    });
    const all = rows.reduce((t, r) => t + r.games, 0);
    expect(all).toBe(rows.reduce((t, r) => t + r.wins + r.losses + r.ties, 0));
  });

  it("is empty for a roster with no games", () => {
    expect(headToHead([], 4)).toEqual([]);
    expect(fixture.rosters).toHaveLength(12);
  });
});
