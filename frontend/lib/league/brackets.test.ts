import { describe, expect, it } from "vitest";

import { fixture, pastFixture } from "@/lib/test/league-mock";
import { bracketColumns, finishOrder, fromSleeper, lastFinishedWeek, projectedBracket } from "./brackets";
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
    expect(b.rounds[1][0].b).toEqual({ rosterId: null, seed: null, feeder: 1 });
  });
});

// A bracket's draw without its results.
const draw = (rounds: ReturnType<typeof fromSleeper>["rounds"]) =>
  rounds.map((r) => r.map((m) => [m.id, m.a.rosterId, m.b.rosterId]));

describe("projectedBracket", () => {
  it("matches the bracket Sleeper drew from the same standings", () => {
    const seeds = seedsOf(fixture);
    expect(projectedBracket(seeds)).toEqual(fromSleeper(fixture.winners_bracket, seeds));
  });

  it("gives seeds 1 and 2 byes and pairs 4 v 5 and 3 v 6, as Sleeper did in 2024 and 2025", () => {
    for (const s of [season2024, season2025]) {
      const seeds = seedsOf(s);
      const real = fromSleeper(s.winners_bracket, seeds);
      const projected = projectedBracket(seeds);
      expect(projected.byes).toEqual(real.byes);
      expect(draw(projected.rounds)[0]).toEqual(draw(real.rounds)[0]);
      expect(projected.rounds[1].map((m) => m.a.rosterId)).toEqual(real.rounds[1].map((m) => m.a.rosterId));
    }
  });
});

describe("bracketColumns", () => {
  const columns = bracketColumns(fromSleeper(season2025.winners_bracket, seedsOf(season2025)));
  const label = (c: (typeof columns)[number][number]) => (c.kind === "bye" ? `bye ${c.slot.rosterId}` : `game ${c.match.id}`);

  it("puts each bye beside the wild card game whose winner it meets", () => {
    expect(columns.map((col) => col.map(label))).toEqual([
      ["bye 10", "game 1", "bye 4", "game 2"],
      ["game 3", "game 4"],
      ["game 6"],
    ]);
  });

  it("spans every game over its feeders and joins them at their centres", () => {
    expect(columns.map((col) => col.map((c) => c.rows))).toEqual([
      [[0, 2], [2, 4], [4, 6], [6, 8]],
      [[0, 4], [4, 8]],
      [[0, 8]],
    ]);
    const joins = columns.map((col) => col.map((c) => (c.kind === "game" ? c.joins : null)));
    expect(joins).toEqual([[null, null, null, null], [[0.25, 0.75], [0.25, 0.75]], [[0.25, 0.75]]]);
  });

  it("advances each winner into the slot its game feeds, up to the champion", () => {
    for (const col of columns.slice(1)) {
      for (const cell of col) {
        if (cell.kind !== "game") continue;
        for (const s of [cell.match.a, cell.match.b]) {
          const fed = columns.flat().find((c) => c.kind === "game" && c.match.id === s.feeder);
          if (fed?.kind === "game") expect(s.rosterId).toBe(fed.match.winner);
        }
      }
    }
    const final = columns[2][0];
    expect(final.kind === "game" && [final.match.winner, final.match.loser]).toEqual([10, 4]);
  });

  it("lays out a projected bracket with open slots", () => {
    const projected = bracketColumns(projectedBracket(seedsOf(fixture)));
    expect(projected.map((col) => col.map(label))).toEqual([
      ["bye 2", "game 1", "bye 4", "game 2"],
      ["game 3", "game 4"],
      ["game 6"],
    ]);
  });

  it("is empty before Sleeper draws a bracket", () => {
    expect(bracketColumns(fromSleeper([], []))).toEqual([]);
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
