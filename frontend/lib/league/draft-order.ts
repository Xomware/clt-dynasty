import type { SleeperMatchup } from "@/lib/sleeper/types";
import type { Standing } from "./standings";

// Which positions each lineup slot takes, from the old site's
// highest-possible-calculator (itself a port of the iOS app's).
const ELIGIBLE: Record<string, string[]> = {
  FLEX: ["RB", "WR", "TE"],
  REC_FLEX: ["WR", "TE"],
  WRRB_FLEX: ["RB", "WR"],
  SUPER_FLEX: ["QB", "RB", "WR", "TE"],
  DST: ["DEF"],
};

// The best score a roster could have started that week. Greedy, filling the
// narrowest slots first, as the old site did.
export function optimalPoints(points: Record<string, number>, slots: string[], positionOf: (id: string) => string | undefined) {
  const open = slots.map((s) => ELIGIBLE[s] ?? [s]).sort((a, b) => a.length - b.length);
  const pool = Object.entries(points).flatMap(([id, pts]) => {
    const pos = positionOf(id);
    return pos ? [{ id, pos, pts }] : [];
  });
  const used = new Set<string>();
  let total = 0;
  for (const eligible of open) {
    const best = pool
      .filter((c) => !used.has(c.id) && eligible.includes(c.pos))
      .reduce<(typeof pool)[number] | null>((b, c) => (!b || c.pts > b.pts ? c : b), null);
    if (!best) continue;
    used.add(best.id);
    total += best.pts;
  }
  return total;
}

// Highest possible points over the weeks given, per roster.
export function seasonHpp(weeks: SleeperMatchup[][], slots: string[], positionOf: (id: string) => string | undefined) {
  const hpp = new Map<number, number>();
  for (const rows of weeks) {
    for (const m of rows) {
      if (!m.players_points) continue;
      hpp.set(m.roster_id, (hpp.get(m.roster_id) ?? 0) + optimalPoints(m.players_points, slots, positionOf));
    }
  }
  return hpp;
}

export interface DraftSlot {
  pick: number;
  rosterId: number;
  playoff: boolean;
}

// The rulebook: non-playoff teams by record, worst first; then playoff teams
// by finish, champion last. Before the final, playoff teams go by seed.
// `hpp` swaps the non-playoff order for proposal #57's: lowest HPP first.
// The old site parked seed 1 at the front of the playoff group, the reverse
// of the rule.
export function draftOrder(
  standings: Standing[],
  seeds: number[],
  playoffTeams: number,
  finish: number[] | null,
  hpp?: Map<number, number>,
): DraftSlot[] {
  const playoff = seeds.slice(0, playoffTeams);
  const rank = (id: number) => standings.findIndex((s) => s.rosterId === id);
  const rest = standings
    .map((s) => s.rosterId)
    .filter((id) => !playoff.includes(id))
    .sort((a, b) => (hpp ? (hpp.get(a) ?? 0) - (hpp.get(b) ?? 0) : 0) || rank(b) - rank(a));
  const back = [...(finish?.slice(0, playoffTeams) ?? playoff)].reverse();
  return [...rest.map((id) => ({ id, playoff: false })), ...back.map((id) => ({ id, playoff: true }))].map((s, i) => ({
    pick: i + 1,
    rosterId: s.id,
    playoff: s.playoff,
  }));
}
