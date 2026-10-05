import type { SleeperLeague, SleeperRoster } from "@/lib/sleeper/types";

export interface Standing {
  rosterId: number;
  wins: number;
  losses: number;
  ties: number;
  pf: number;
  pa: number;
  division: number | null;
  streak: string;
}

// The rulebook: overall record, then total points for.
export function sortStandings(rosters: SleeperRoster[]): Standing[] {
  return rosters
    .map(({ roster_id, settings: s, metadata }) => ({
      rosterId: roster_id,
      wins: s.wins,
      losses: s.losses,
      ties: s.ties,
      pf: s.fpts + (s.fpts_decimal ?? 0) / 100,
      pa: (s.fpts_against ?? 0) + (s.fpts_against_decimal ?? 0) / 100,
      division: s.division ?? null,
      streak: metadata?.streak ?? "",
    }))
    .sort((a, b) => b.wins - a.wins || b.ties - a.ties || b.pf - a.pf);
}

// Each division's winner takes seeds 1-3, the rest follow on record. Sleeper
// seeds its bracket the same way.
export function playoffSeeds(standings: Standing[]): number[] {
  const winners = new Set<number>();
  const seen = new Set<number | null>();
  for (const s of standings) {
    if (s.division === null || seen.has(s.division)) continue;
    seen.add(s.division);
    winners.add(s.rosterId);
  }
  const ids = standings.map((s) => s.rosterId);
  return [...ids.filter((id) => winners.has(id)), ...ids.filter((id) => !winners.has(id))];
}

export function divisionName(league: SleeperLeague, division: number | null): string {
  return (division !== null && league.metadata?.[`division_${division}`]) || `Division ${division ?? "?"}`;
}
