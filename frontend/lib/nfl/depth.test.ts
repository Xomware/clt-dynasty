import { describe, expect, it } from "vitest";

import type { Player } from "@/lib/api/players";
import { depthChart } from "./depth";

const p = (player_id: string, position: string, team: string, depth_chart_order?: number, search_rank?: number): Player => ({
  player_id,
  position,
  team,
  depth_chart_order,
  search_rank,
});

describe("depth chart", () => {
  // LAC's 2026 receivers: Sleeper ranks across LWR, RWR and the slot.
  const players = Object.fromEntries(
    [
      p("johnston", "WR", "LAC", 2, 103),
      p("mcconkey", "WR", "LAC", 1, 35),
      p("harris", "WR", "LAC", 3, 179),
      p("jennings", "WR", "LAC", undefined, 426),
      p("hill", "WR", "LAC", undefined, 300),
      p("tie-b", "TE", "LAC", 3, 600),
      p("tie-a", "TE", "LAC", 3, 131),
      p("herbert", "QB", "LAC", 1, 33),
      p("allen", "QB", "BUF", 1, 3),
    ].map((x) => [x.player_id, x]),
  );

  it("groups the team by position in chart order", () => {
    const chart = depthChart(players, "LAC");
    expect(chart.map((g) => g.position)).toEqual(["QB", "RB", "WR", "TE", "K"]);
    expect(chart[0].charted.map((x) => x.player_id)).toEqual(["herbert"]);
    const wr = chart[2];
    expect(wr.charted.map((x) => x.player_id)).toEqual(["mcconkey", "johnston", "harris"]);
    expect(wr.rest.map((x) => x.player_id)).toEqual(["hill", "jennings"]);
  });

  it("breaks a tie on the chart by search rank", () => {
    expect(depthChart(players, "LAC")[3].charted.map((x) => x.player_id)).toEqual(["tie-a", "tie-b"]);
  });
});
