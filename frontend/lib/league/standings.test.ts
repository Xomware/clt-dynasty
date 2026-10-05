import { describe, expect, it } from "vitest";

import { fixture } from "@/lib/test/league-mock";
import type { SleeperRoster } from "@/lib/sleeper/types";
import { divisionName, playoffSeeds, sortStandings } from "./standings";

const rosters = fixture.rosters;

function roster(roster_id: number, wins: number, ties = 0, fpts = 100, fpts_decimal = 0, division = 1): SleeperRoster {
  return {
    roster_id,
    owner_id: null,
    co_owners: null,
    starters: [],
    players: null,
    taxi: null,
    settings: { wins, losses: 3 - wins - ties, ties, fpts, fpts_decimal, division },
    metadata: null,
  };
}

const ids = (rows: { rosterId: number }[]) => rows.map((r) => r.rosterId);

describe("sortStandings", () => {
  it("orders the real week-3 table by record, then points for", () => {
    // Same order the old site's StandingsService (wins, then fpts) gives for this table.
    expect(ids(sortStandings(rosters))).toEqual([2, 4, 12, 5, 7, 11, 3, 8, 10, 9, 6, 1]);
  });

  it("carries points with their decimals, the division and Sleeper's streak", () => {
    const top = sortStandings(rosters)[0];
    expect(top).toEqual({ rosterId: 2, wins: 3, losses: 0, ties: 0, pf: 524.02, pa: 410.3, division: 3, streak: "3W" });
  });

  it("counts a tie above a loss before comparing points", () => {
    expect(ids(sortStandings([roster(1, 1, 0, 500), roster(2, 1, 1, 100)]))).toEqual([2, 1]);
  });

  it("treats missing decimals and points against as zero", () => {
    const [row] = sortStandings([roster(1, 0)]);
    expect(row.pf).toBe(100);
    expect(row.pa).toBe(0);
  });
});

describe("playoffSeeds", () => {
  it("matches the bracket Sleeper drew from the same standings", () => {
    const seeds = playoffSeeds(sortStandings(rosters));
    const bracket = fixture.winners_bracket;
    const pair = (m: number) => {
      const g = bracket.find((b) => b.m === m)!;
      return [g.t1, g.t2].sort();
    };
    // Division winners 2, 4 and 5 take seeds 1-3 ahead of 12, which has the better record than 5.
    expect(seeds.slice(0, 6)).toEqual([2, 4, 5, 12, 7, 11]);
    expect(pair(1)).toEqual([seeds[3], seeds[4]].sort());
    expect(pair(2)).toEqual([seeds[2], seeds[5]].sort());
    // Seeds 1 and 2 wait in round 2.
    expect(bracket.filter((b) => b.r === 2 && !b.p).map((b) => b.t1)).toEqual([seeds[0], seeds[1]]);
  });

  it("keeps every team, division winners first", () => {
    const seeds = playoffSeeds(sortStandings([roster(1, 3, 0, 100, 0, 1), roster(2, 2, 0, 100, 0, 1), roster(3, 0, 0, 100, 0, 2)]));
    expect(seeds).toEqual([1, 3, 2]);
  });
});

describe("divisionName", () => {
  it("reads the league's division names, with a fallback", () => {
    const league = fixture.league;
    expect([1, 2, 3].map((d) => divisionName(league, d))).toEqual(["BIG10", "SEC", "ACC"]);
    expect(divisionName(league, 4)).toBe("Division 4");
  });
});
