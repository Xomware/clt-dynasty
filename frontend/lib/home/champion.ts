import { league, rosters, users, winnersBracket } from "@/lib/league/cache";
import { type Team, teamOf } from "@/lib/league/use-league";

export interface Champion {
  season: string;
  leagueId: string;
  rosterId: number;
  team: Team;
  runnerUp: Team | null;
}

// The last finished season's final (p=1) winner: this season's once it is
// complete, otherwise the one before it. Null before any final is played.
export async function reigningChampion(): Promise<Champion | null> {
  const current = await league();
  const leagueId = current.status === "complete" ? current.league_id : current.previous_league_id;
  if (!leagueId || leagueId === "0") return null;
  const [l, bracket, u, r] = await Promise.all([league(leagueId), winnersBracket(false, leagueId), users(leagueId), rosters(leagueId)]);
  const final = bracket.find((m) => m.p === 1);
  if (!final?.w) return null;
  const team = (id: number) => teamOf(u, r.find((x) => x.roster_id === id), id);
  return { season: l.season, leagueId, rosterId: final.w, team: team(final.w), runnerUp: final.l ? team(final.l) : null };
}
