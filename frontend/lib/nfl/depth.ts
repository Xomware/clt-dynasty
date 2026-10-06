import type { Player } from "@/lib/api/players";

export const DEPTH_POSITIONS = ["QB", "RB", "WR", "TE", "K"];

const LAST = Number.MAX_SAFE_INTEGER;
const byDepth = (a: Player, b: Player) =>
  (a.depth_chart_order ?? LAST) - (b.depth_chart_order ?? LAST) || (a.search_rank ?? LAST) - (b.search_rank ?? LAST);

export interface DepthGroup {
  position: string;
  // On Sleeper's depth chart, starter first. Ties (a few teams list two WR3s) go by search rank.
  charted: Player[];
  // On the team but off the chart: practice squad, injured reserve, the newly signed.
  rest: Player[];
}

export function depthChart(players: Record<string, Player>, team: string): DepthGroup[] {
  const on = Object.values(players).filter((p) => p.team === team);
  return DEPTH_POSITIONS.map((position) => {
    const group = on.filter((p) => p.position === position).sort(byDepth);
    return {
      position,
      charted: group.filter((p) => p.depth_chart_order !== undefined),
      rest: group.filter((p) => p.depth_chart_order === undefined),
    };
  });
}
