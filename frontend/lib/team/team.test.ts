import { describe, expect, it } from "vitest";

import type { Player } from "@/lib/api/players";
import type { SleeperLeague, SleeperRoster } from "@/lib/sleeper/types";
import { readTeamLink } from "./links";
import { rankOf, rosterGroups } from "./team";

type PlayerMap = Record<string, Player>;

const roster = (roster_id: number, wins: number, losses: number, fpts: number, division?: number): SleeperRoster => ({
  roster_id,
  owner_id: `u${roster_id}`,
  co_owners: null,
  starters: [],
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
  scoring_settings: {},
  total_rosters: 4,
  previous_league_id: null,
  roster_positions: positions,
  settings: { divisions: 2, playoff_week_start: 15, playoff_teams: 6 },
  metadata: { division_1: "North", division_2: "South" },
});

describe("team rank", () => {
  const rosters = [roster(1, 1, 2, 300, 1), roster(2, 3, 0, 250, 2), roster(3, 1, 2, 320, 2), roster(4, 2, 1, 200, 1)];

  it("ranks a team in its league and its division in the Standings order", () => {
    expect(rankOf(rosters, 3)).toMatchObject({ league: 3, of: 4, division: { rank: 2, of: 2 } });
    expect(rankOf(rosters, 4)).toMatchObject({ league: 2, of: 4, division: { rank: 1, of: 2 } });
    expect(rankOf(rosters, 9)).toBeNull();
  });
});

describe("roster groups", () => {
  const players: PlayerMap = {
    q1: { player_id: "q1", first_name: "Quinn", last_name: "Arm", position: "QB" },
    r1: { player_id: "r1", first_name: "Rhett", last_name: "Back", position: "RB" },
    w1: { player_id: "w1", first_name: "Will", last_name: "Wide", position: "WR" },
    w2: { player_id: "w2", first_name: "Abe", last_name: "Wide", position: "WR" },
    t1: { player_id: "t1", first_name: "Tad", last_name: "Tight", position: "TE" },
    x1: { player_id: "x1", first_name: "Xavier", last_name: "Taxi", position: "WR" },
    i1: { player_id: "i1", first_name: "Ian", last_name: "Hurt", position: "RB" },
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

describe("team links", () => {
  it("reads CLT and other-league team links", () => {
    expect(readTeamLink("4")).toEqual({ rosterId: 4 });
    expect(readTeamLink("1180000000000000000:12")).toEqual({ leagueId: "1180000000000000000", rosterId: 12 });
    expect(readTeamLink("0")).toBeNull();
    expect(readTeamLink("x:1")).toBeNull();
  });
});
