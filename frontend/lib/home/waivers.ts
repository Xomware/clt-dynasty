import { type Values, valueOf } from "@/lib/analyzer/values";
import type { Player } from "@/lib/api/players";
import type { SleeperRoster } from "@/lib/sleeper/types";
import { canFill } from "./lineup";
import type { PlayerWeek } from "./projections";

// One projected point this week is worth this much FantasyCalc value. Dynasty
// value leads, but a waiver pickup usually earns his spot by playing now.
export const POINT_VALUE = 50;
// An add has to beat the player he replaces by a fifth, plus a floor, so two
// near-worthless bench players never trade places.
export const MARGIN = 1.2;
export const FLOOR = 25;

// How the team stands at a position against the league: 1st is deepest.
export interface Need {
  position: string;
  valueRank: number;
  weekRank: number;
  teams: number;
  // 0 for the deepest team on both counts, 1 for the thinnest.
  score: number;
}

export interface Candidate {
  id: string;
  position: string;
  value: number;
  points: number;
  merit: number;
}

export interface Pickup {
  add: Candidate;
  // null while the roster has an open spot.
  drop: Candidate | null;
  need: Need;
}

interface PickupInput {
  rosterId: number;
  rosters: SleeperRoster[];
  players: Record<string, Player>;
  values: Values;
  week: (id: string) => PlayerWeek;
  slots: string[];
  // Active roster size: starters plus bench, taxi and IR apart.
  rosterSize: number;
  limit?: number;
}

const active = (r: SleeperRoster) => {
  const apart = new Set([...(r.taxi ?? []), ...(r.reserve ?? [])]);
  return (r.players ?? []).filter((id) => !apart.has(id));
};

// Rank 1 for the largest; ties share the better rank.
const rankOf = (mine: number, all: number[]) => all.filter((v) => v > mine).length + 1;

// Free agents ranked for one team: dynasty value plus this week's projection,
// weighted up at the positions where the team is thinnest. Each add is paired
// with the weakest bench player it beats, never a starter, taxi or IR player,
// and never one the lineup can't do without.
export function suggestPickups({ rosterId, rosters, players, values, week, slots, rosterSize, limit = 3 }: PickupInput): Pickup[] {
  const mine = rosters.find((r) => r.roster_id === rosterId);
  if (!mine) return [];
  const positions = [...new Set(Object.values(players).map((p) => p.position ?? ""))].filter((p) => slots.some((s) => canFill(s, p)));
  // A two-way player counts at the first of his positions a lineup can use.
  const position = (id: string) => {
    const w = week(id);
    return w.positions.find((p) => positions.includes(p)) ?? (w.position || players[id]?.position || "");
  };
  const value = (id: string) => valueOf(values, id);

  // Dedicated slots at the position (QB also counts SUPER_FLEX): the bodies a lineup needs there.
  const required = (p: string) => slots.filter((s) => s === p || (p === "QB" && s === "SUPER_FLEX")).length;
  const needs = new Map<string, Need>();
  for (const p of positions) {
    const depth = rosters.map((r) => active(r).filter((id) => position(id) === p));
    const total = (ids: string[]) => ids.reduce((sum, id) => sum + value(id), 0);
    const weekOf = (ids: string[]) =>
      ids
        .map((id) => week(id).points)
        .sort((a, b) => b - a)
        .slice(0, required(p) + 1)
        .reduce((a, b) => a + b, 0);
    const at = rosters.indexOf(mine);
    const valueRank = rankOf(total(depth[at]), depth.map(total));
    const weekRank = rankOf(weekOf(depth[at]), depth.map(weekOf));
    const teams = rosters.length;
    needs.set(p, { position: p, valueRank, weekRank, teams, score: teams > 1 ? (valueRank + weekRank - 2) / (2 * (teams - 1)) : 0 });
  }

  const candidate = (id: string): Candidate | null => {
    const need = needs.get(position(id));
    if (!need) return null;
    const points = week(id).points;
    return { id, position: position(id), value: value(id), points, merit: (value(id) + POINT_VALUE * points) * (0.75 + need.score / 2) };
  };

  const rostered = new Set(rosters.flatMap((r) => r.players ?? []));
  const adds = Object.keys(players)
    .filter((id) => !rostered.has(id) && (value(id) > 0 || week(id).points > 0))
    .flatMap((id) => candidate(id) ?? [])
    .sort((a, b) => b.merit - a.merit);

  const mineActive = active(mine);
  const starters = new Set(mine.starters);
  const count = (p: string) => mineActive.filter((id) => position(id) === p).length;
  const drops = mineActive
    .filter((id) => !starters.has(id))
    .flatMap((id) => candidate(id) ?? { id, position: position(id), value: value(id), points: week(id).points, merit: value(id) + POINT_VALUE * week(id).points })
    .sort((a, b) => a.merit - b.merit);

  let open = Math.max(0, rosterSize - mineActive.length);
  const dropped = new Map<string, number>();
  const picks: Pickup[] = [];
  for (const add of adds) {
    if (picks.length >= limit) break;
    const need = needs.get(add.position);
    if (!need) continue;
    if (open > 0) {
      open--;
      picks.push({ add, drop: null, need });
      continue;
    }
    // A drop can't leave fewer players at a position than its slots need, counting this add.
    const drop = drops.find((d) => {
      if (picks.some((p) => p.drop?.id === d.id)) return false;
      const left = count(d.position) - (dropped.get(d.position) ?? 0) - 1 + (add.position === d.position ? 1 : 0);
      return left >= required(d.position);
    });
    if (!drop || add.merit <= drop.merit * MARGIN + FLOOR) continue;
    // Dynasty: giving up the better long-term asset for this week's points
    // only makes sense where the team is short.
    if (drop.value > add.value && need.score < 0.5) continue;
    dropped.set(drop.position, (dropped.get(drop.position) ?? 0) + 1);
    picks.push({ add, drop, need });
  }
  return picks;
}
