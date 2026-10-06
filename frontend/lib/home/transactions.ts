import { transactions } from "@/lib/league/cache";
import type { SleeperTransaction } from "@/lib/sleeper/types";

export interface MoveSide {
  rosterId: number;
  adds: string[];
  drops: string[];
  // Picks this side receives, as "2027 Round 3".
  picks: string[];
  faab: number;
}

export interface Move {
  id: string;
  type: SleeperTransaction["type"];
  at: number;
  bid: number | null;
  sides: MoveSide[];
}

const playersFor = (map: Record<string, number> | null, rosterId: number) =>
  Object.entries(map ?? {})
    .filter(([, r]) => r === rosterId)
    .map(([id]) => id);

export function toMove(t: SleeperTransaction): Move {
  return {
    id: t.transaction_id,
    type: t.type,
    at: t.status_updated,
    bid: t.settings?.waiver_bid ?? null,
    sides: t.roster_ids.map((rosterId) => ({
      rosterId,
      adds: playersFor(t.adds, rosterId),
      drops: playersFor(t.drops, rosterId),
      picks: t.draft_picks.filter((p) => p.owner_id === rosterId).map((p) => `${p.season} Round ${p.round}`),
      faab: t.waiver_budget.filter((b) => b.receiver === rosterId).reduce((sum, b) => sum + b.amount, 0),
    })),
  };
}

// The newest completed moves from this week and last, so Tuesday's waivers
// still show once the week turns over. Failed claims are dropped.
export async function recentMoves(week: number, live: boolean, count = 6): Promise<Move[]> {
  const weeks = week > 1 ? [week, week - 1] : [week];
  const rows = (await Promise.all(weeks.map((w) => transactions(w, live && w === week)))).flat();
  return rows
    .filter((t) => t.status === "complete")
    .sort((a, b) => b.status_updated - a.status_updated)
    .slice(0, count)
    .map(toMove);
}
