import { describe, expect, it } from "vitest";

import { fixture } from "@/lib/test/league-mock";
import type { SleeperMatchup } from "@/lib/sleeper/types";
import { startingSlots, weekGames } from "./use-week-games";

const slots = startingSlots(fixture.league.roster_positions);

describe("weekGames", () => {
  it("pairs the real week-3 rows into the league's six games", () => {
    const games = weekGames(fixture.matchups["3"], slots);
    expect(games.map((g) => [g.id, ...g.sides.map((s) => s.rosterId)])).toEqual([
      [1, 1, 8],
      [2, 4, 7],
      [3, 2, 12],
      [4, 3, 6],
      [5, 5, 10],
      [6, 9, 11],
    ]);
  });

  it("lines the starters up with the league's slots and sorts the bench by points", () => {
    const side = weekGames(fixture.matchups["3"], slots)[2].sides[0];
    expect(slots).toEqual(["QB", "RB", "RB", "WR", "WR", "TE", "FLEX", "FLEX", "SUPER_FLEX"]);
    expect(side.starters?.map((s) => s.slot)).toEqual(slots);
    expect(side.starters?.[0]).toEqual({ slot: "QB", playerId: "7523", points: 19.78 });
    expect(side.starters?.reduce((t, s) => t + s.points, 0)).toBeCloseTo(side.points);
    const bench = side.bench!.map((b) => b.points);
    expect(bench).toEqual([...bench].sort((a, b) => b - a));
  });

  it("reads an empty slot and a missing lineup", () => {
    const rows: SleeperMatchup[] = [
      { roster_id: 1, matchup_id: 1, points: 0, starters: ["0"], starters_points: [0], players: ["9"], players_points: { "9": 4 } },
      { roster_id: 2, matchup_id: 1, points: 0, starters: null, starters_points: [], players: null, players_points: null },
      { roster_id: 3, matchup_id: null, points: 0, starters: [], starters_points: [], players: [], players_points: {} },
    ];
    const [game] = weekGames(rows, ["QB"]);
    expect(game.sides[0].starters).toEqual([{ slot: "QB", playerId: null, points: 0 }]);
    expect(game.sides[0].bench).toEqual([{ playerId: "9", points: 4 }]);
    expect(game.sides[1]).toEqual({ rosterId: 2, points: 0, starters: null, bench: null });
    expect(weekGames(rows, ["QB"])).toHaveLength(1);
  });
});
