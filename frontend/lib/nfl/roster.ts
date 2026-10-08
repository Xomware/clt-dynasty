import { type Player, playerName } from "@/lib/api/players";
import { depthChart } from "./depth";
import type { PlayerRanks } from "./use-ranks";

export interface RosterRow {
  player: Player;
  // His place at his position on the chart; null off it.
  depth: number | null;
  // Position, then chart order, then the off-chart: the roster's natural order.
  order: number;
  ranks: PlayerRanks;
}

export function rosterRows(players: Record<string, Player>, team: string, ranks: (id: string) => PlayerRanks): RosterRow[] {
  return depthChart(players, team)
    .flatMap((g) => [...g.charted.map((p, i) => ({ p, depth: i + 1 })), ...g.rest.map((p) => ({ p, depth: null }))])
    .map(({ p, depth }, order) => ({ player: p, depth, order, ranks: ranks(p.player_id) }));
}

export type SortKey = "depth" | "name" | "season" | "seasonRank" | "proj" | "projRank" | "dynasty" | "dynastyRank";

const VALUE: Record<SortKey, (r: RosterRow) => number | string | null> = {
  depth: (r) => r.order,
  name: (r) => playerName(r.player, r.player.player_id),
  season: (r) => r.ranks.season?.points ?? null,
  seasonRank: (r) => r.ranks.season?.rank ?? null,
  proj: (r) => r.ranks.projected?.points ?? null,
  projRank: (r) => r.ranks.projected?.rank ?? null,
  dynasty: (r) => r.ranks.dynasty?.value ?? null,
  dynastyRank: (r) => r.ranks.dynasty?.rank ?? null,
};

// Points and values read best high-first; ranks, names and the chart low-first.
export const firstDirection = (key: SortKey): "asc" | "desc" => (key === "season" || key === "proj" || key === "dynasty" ? "desc" : "asc");

// A player with no value for the column sorts last either way, then in roster order.
export function sortRows(rows: RosterRow[], key: SortKey, dir: "asc" | "desc"): RosterRow[] {
  const value = VALUE[key];
  const sign = dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const x = value(a);
    const y = value(b);
    if (x === null || y === null) return x === y ? a.order - b.order : x === null ? 1 : -1;
    const diff = typeof x === "string" ? x.localeCompare(String(y)) : x - (y as number);
    return sign * diff || a.order - b.order;
  });
}
