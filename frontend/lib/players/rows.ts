import { type Player, playerName } from "@/lib/api/players";
import { designation, sidelined } from "@/lib/nfl/injury";
import type { SleeperRoster } from "@/lib/sleeper/types";
import { POSITIONS, type SortKey, type View } from "./params";

export type RosterSlot = "active" | "taxi" | "ir";

export interface PlayerRow {
  id: string;
  name: string;
  position: string;
  team: string | null;
  // The CLT roster he is on, and where on it.
  owner: number | null;
  slot: RosterSlot | null;
  player: Player;
  rookie: boolean;
  age: number | null;
  // Season totals in CLT scoring; null before he has scored.
  pts: number | null;
  ppg: number | null;
  rank: number | null;
  // This week's projection; null out of season.
  proj: number | null;
  // Average weekly projection over the rest of the season, once loaded.
  ros: number | null;
  // FantasyCalc dynasty value; 0 when unlisted.
  value: number;
}

export interface RowSources {
  players: Record<string, Player>;
  rosters: SleeperRoster[];
  season: (id: string) => { points: number; rank: number; games: number } | null;
  proj: ((id: string) => number) | null;
  ros: Map<string, number> | null;
  value: (id: string) => number;
}

export function buildRows({ players, rosters, season, proj, ros, value }: RowSources): PlayerRow[] {
  const where = new Map<string, { owner: number; slot: RosterSlot }>();
  for (const r of rosters) {
    const taxi = new Set(r.taxi ?? []);
    const ir = new Set(r.reserve ?? []);
    for (const id of r.players ?? []) where.set(id, { owner: r.roster_id, slot: taxi.has(id) ? "taxi" : ir.has(id) ? "ir" : "active" });
  }
  return Object.values(players)
    .filter((p) => (POSITIONS as readonly string[]).includes(p.position ?? ""))
    .map((p) => {
      const id = p.player_id;
      const s = season(id);
      const at = where.get(id);
      return {
        id,
        name: playerName(p, id),
        position: p.position as string,
        team: p.team ?? null,
        owner: at?.owner ?? null,
        slot: at?.slot ?? null,
        player: p,
        rookie: p.years_exp === 0,
        age: p.age ?? null,
        pts: s ? s.points : null,
        ppg: s && s.games > 0 ? Math.round((s.points / s.games) * 10) / 10 : null,
        rank: s?.rank ?? null,
        proj: proj ? proj(id) : null,
        ros: ros?.get(id) ?? null,
        value: value(id),
      };
    });
}

function healthOf(p: Player): View["health"] {
  const d = designation(p);
  if (!d) return "healthy";
  return sidelined(d) ? "out" : "questionable";
}

// Everything but the search text, which the caller matches with the shared player search.
export function filterRows(rows: PlayerRow[], view: View, mine: number | null, matches: Set<string> | null): PlayerRow[] {
  return rows.filter((r) => {
    if (matches && !matches.has(r.id)) return false;
    if (view.pos.length && !view.pos.includes(r.position)) return false;
    if (view.nfl === "FA" ? r.team !== null : view.nfl && r.team !== view.nfl) return false;
    if (view.owner === "available" && r.owner !== null) return false;
    if (view.owner === "mine" && (mine === null || r.owner !== mine)) return false;
    if (typeof view.owner === "number" && r.owner !== view.owner) return false;
    if (view.slot !== "any" && r.slot !== view.slot) return false;
    if (view.health !== "any" && healthOf(r.player) !== view.health) return false;
    if (view.rookies && !r.rookie) return false;
    if (view.ageMin !== null && (r.age === null || r.age < view.ageMin)) return false;
    if (view.ageMax !== null && (r.age === null || r.age > view.ageMax)) return false;
    return true;
  });
}

const LAST = Number.MAX_SAFE_INTEGER;

// Players without the number sort after those with it either way; ties fall
// to dynasty value, then Sleeper's search rank.
export function sortRows(rows: PlayerRow[], sort: SortKey, desc: boolean): PlayerRow[] {
  const key = (r: PlayerRow) => r[sort];
  return [...rows].sort((a, b) => {
    const x = key(a);
    const y = key(b);
    if (x !== y) {
      if (x === null) return 1;
      if (y === null) return -1;
      return desc ? y - x : x - y;
    }
    return b.value - a.value || (a.player.search_rank ?? LAST) - (b.player.search_rank ?? LAST);
  });
}
