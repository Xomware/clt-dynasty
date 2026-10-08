import type { Values } from "@/lib/analyzer/values";
import type { SleeperStatRow } from "@/lib/sleeper/types";

type Stats = Record<string, number>;

// Points under the league's own scoring: each scored stat times its weight.
// Checked against Sleeper's players_points for every CLT starter, weeks 1-4 of 2026.
// Projections only split missed kicks by distance, so a missed FG counts from those.
export function fantasyPoints(stats: Stats, scoring: Record<string, number>): number {
  let total = 0;
  for (const [key, weight] of Object.entries(scoring)) {
    const n = key === "fgmiss" && stats.fgmiss === undefined ? missedKicks(stats) : stats[key];
    if (n) total += n * weight;
  }
  return Math.round(total * 100) / 100;
}

const missedKicks = (stats: Stats) => Object.entries(stats).reduce((sum, [k, n]) => (k.startsWith("fgmiss_") ? sum + n : sum), 0);

export interface PositionRank {
  points: number;
  // 1 is the position's best.
  rank: number;
  position: string;
}

// Ranks every player with a line within his position, best points first. A row
// with nothing scored (a bye week's projection, a player who hasn't played) is unranked.
export function positionRanks(rows: SleeperStatRow[], scoring: Record<string, number>): Map<string, PositionRank> {
  const scored = rows.flatMap((r) => {
    const position = r.player?.position;
    if (!position || !r.stats || Object.keys(r.stats).length === 0) return [];
    const points = fantasyPoints(r.stats, scoring);
    return points > 0 ? [{ id: r.player_id, position, points }] : [];
  });
  scored.sort((a, b) => b.points - a.points);
  const seen = new Map<string, number>();
  const ranks = new Map<string, PositionRank>();
  for (const { id, position, points } of scored) {
    const rank = (seen.get(position) ?? 0) + 1;
    seen.set(position, rank);
    ranks.set(id, { points, rank, position });
  }
  return ranks;
}

export interface DynastyRank {
  value: number;
  overall: number;
  // Within his FantasyCalc position.
  rank: number;
  position: string;
}

export function dynastyRanks(values: Values): Map<string, DynastyRank> {
  const rows = [...values.players].filter(([, v]) => v.value > 0 && v.position).sort(([, a], [, b]) => b.value - a.value);
  const seen = new Map<string, number>();
  return new Map(
    rows.map(([id, v], i) => {
      const position = v.position as string;
      const rank = (seen.get(position) ?? 0) + 1;
      seen.set(position, rank);
      return [id, { value: v.value, overall: i + 1, rank, position }];
    }),
  );
}
