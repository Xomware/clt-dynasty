import { describe, expect, it } from "vitest";

import type { PlayerMap } from "@/lib/players";
import type { SleeperLeague, SleeperRoster } from "@/lib/sleeper/league";
import { readTeamLink } from "./links";
import { rankOf, rosterGroups, sortByRecord, streakOf, teamName } from "./team";

const roster = (roster_id: number, wins: number, losses: number, fpts: number, division?: number): SleeperRoster => ({
  roster_id,
  owner_id: `u${roster_id}`,
  co_owners: null,
  starters: null,
  players: null,
  taxi: null,
  reserve: null,
  settings: { wins, losses, ties: 0, fpts, fpts_decimal: 0, division },
  metadata: null,
});

const league = (positions: string[]): SleeperLeague => ({
  league_id: "1",
  name: "Test League",
  season: "2026",
  status: "in_season",
  avatar: null,
  total_rosters: 4,
  previous_league_id: null,
  roster_positions: positions,
  settings: { divisions: 2 },
  metadata: { division_1: "North", division_2: "South" },
});

describe("standings order", () => {
  const rosters = [roster(1, 1, 2, 300, 1), roster(2, 3, 0, 250, 2), roster(3, 1, 2, 320, 2), roster(4, 2, 1, 200, 1)];

  it("ranks by record, then points for", () => {
    expect(sortByRecord(rosters).map((r) => r.roster_id)).toEqual([2, 4, 3, 1]);
  });

  it("ranks a team in its league and its division", () => {
    expect(rankOf(rosters, 3)).toEqual({ league: 3, of: 4, division: { rank: 2, of: 2 } });
    expect(rankOf(rosters, 4)).toEqual({ league: 2, of: 4, division: { rank: 1, of: 2 } });
    expect(rankOf(rosters, 9)).toBeNull();
  });

  it("counts a tie as half a win", () => {
    const tied = { ...roster(5, 1, 1, 100), settings: { wins: 1, losses: 1, ties: 1, fpts: 100 } };
    expect(sortByRecord([roster(6, 1, 2, 999), tied]).map((r) => r.roster_id)).toEqual([5, 6]);
  });
});

describe("roster groups", () => {
  const players: PlayerMap = {
    q1: { player_id: "q1", full_name: "Quinn Arm", position: "QB" },
    r1: { player_id: "r1", full_name: "Rhett Back", position: "RB" },
    w1: { player_id: "w1", full_name: "Will Wide", position: "WR" },
    w2: { player_id: "w2", full_name: "Abe Wide", position: "WR" },
    t1: { player_id: "t1", full_name: "Tad Tight", position: "TE" },
    x1: { player_id: "x1", full_name: "Xavier Taxi", position: "WR" },
    i1: { player_id: "i1", full_name: "Ian Hurt", position: "RB" },
  };
  const team: SleeperRoster = {
    ...roster(1, 0, 0, 0),
    starters: ["q1", "0", "w1"],
    players: ["q1", "r1", "w1", "w2", "t1", "x1", "i1", "gone"],
    taxi: ["x1"],
    reserve: ["i1"],
  };

  it("labels starters by slot and keeps an empty slot", () => {
    const { starters } = rosterGroups(team, league(["QB", "RB", "SUPER_FLEX", "BN", "BN"]), players);
    expect(starters).toEqual([
      { slot: "QB", id: "q1" },
      { slot: "RB", id: null },
      { slot: "SUPER_FLEX", id: "w1" },
    ]);
  });

  it("benches everyone else off the taxi squad and IR, by position then name", () => {
    const groups = rosterGroups(team, league(["QB", "RB", "FLEX", "BN"]), players);
    expect(groups.bench).toEqual(["r1", "w2", "t1", "gone"]);
    expect(groups.taxi).toEqual(["x1"]);
    expect(groups.reserve).toEqual(["i1"]);
  });
});

describe("team details", () => {
  it("names a team by its Sleeper team name, then the manager, then the roster", () => {
    const r = roster(7, 0, 0, 0);
    const user = { user_id: "u7", display_name: "manager7", avatar: null, metadata: { team_name: "Crown Town" } };
    expect(teamName(r, [user], 7)).toBe("Crown Town");
    expect(teamName(r, [{ ...user, metadata: null }], 7)).toBe("manager7");
    expect(teamName(r, [], 7)).toBe("Team 7");
  });

  it("reads Sleeper's streak", () => {
    expect(streakOf({ ...roster(1, 0, 3, 0), metadata: { streak: "3L" } })).toEqual({ length: 3, result: "L" });
    expect(streakOf(roster(1, 0, 0, 0))).toBeNull();
  });

  it("reads CLT and other-league team links", () => {
    expect(readTeamLink("4")).toEqual({ rosterId: 4 });
    expect(readTeamLink("1180000000000000000:12")).toEqual({ leagueId: "1180000000000000000", rosterId: 12 });
    expect(readTeamLink("0")).toBeNull();
    expect(readTeamLink("x:1")).toBeNull();
  });
});
