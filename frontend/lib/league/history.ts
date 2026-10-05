import { sharedResource } from "@/lib/shared-resource";
import type {
  SleeperBracketMatch,
  SleeperLeague,
  SleeperMatchup,
  SleeperRoster,
  SleeperUser,
} from "@/lib/sleeper/types";
import { finishOrder, fromSleeper, lastFinishedWeek } from "./brackets";
import { league, leagueMatchups, nflState, rosters, users, winnersBracket } from "./cache";
import { lastLeagueWeek } from "./default-week";
import { playoffSeeds, type Standing, sortStandings } from "./standings";
import { teamOf, type Team } from "./use-league";

// Sleeper mints a new league each season and links it back with
// previous_league_id. The cap stops a malformed chain looping.
const MAX_SEASONS = 12;

export type GameKind = "regular" | "playoff" | "consolation";

export interface PastGame {
  season: string;
  leagueId: string;
  week: number;
  id: number;
  kind: GameKind;
  sides: { rosterId: number; points: number }[];
}

export interface Season {
  league: SleeperLeague;
  users: SleeperUser[];
  rosters: SleeperRoster[];
  standings: Standing[];
  seeds: number[];
  // Champion first; null until the final is played.
  finish: number[] | null;
  // Finished games only.
  games: PastGame[];
}

export async function leagueChain(startId?: string): Promise<SleeperLeague[]> {
  const chain = [await league(startId)];
  while (chain.length < MAX_SEASONS) {
    const previous = chain.at(-1)?.previous_league_id;
    if (!previous || previous === "0") break;
    chain.push(await league(previous));
  }
  return chain;
}

// A playoff week pairs every team, but only the bracket's own games count:
// the rest are Sleeper's consolation pairings, which the league doesn't play.
function kindOf(week: number, ids: number[], start: number, bracket: SleeperBracketMatch[]): GameKind {
  if (week < start) return "regular";
  const round = week - start + 1;
  const inBracket = bracket.some(
    (g) => g.r === round && (g.p === undefined || g.p === 1) && ids.includes(g.t1 ?? -1) && ids.includes(g.t2 ?? -1),
  );
  return inBracket ? "playoff" : "consolation";
}

export function seasonGames(
  l: SleeperLeague,
  weeks: SleeperMatchup[][],
  bracket: SleeperBracketMatch[],
): PastGame[] {
  return weeks.flatMap((rows, i) => {
    const week = i + 1;
    const byId = new Map<number, SleeperMatchup[]>();
    for (const r of rows) if (r.matchup_id !== null) byId.set(r.matchup_id, [...(byId.get(r.matchup_id) ?? []), r]);
    return [...byId]
      .filter(([, pair]) => pair.length === 2 && pair.some((r) => r.points > 0))
      .sort(([a], [b]) => a - b)
      .map(([id, pair]) => ({
        season: l.season,
        leagueId: l.league_id,
        week,
        id,
        kind: kindOf(week, pair.map((r) => r.roster_id), l.settings.playoff_week_start, bracket),
        sides: pair.map((r) => ({ rosterId: r.roster_id, points: r.points })),
      }));
  });
}

async function loadSeason(l: SleeperLeague, finishedWeek: number): Promise<Season> {
  const last = Math.min(lastLeagueWeek(l), finishedWeek);
  const weeks = Array.from({ length: Math.max(0, last) }, (_, i) => i + 1);
  const [u, r, bracket, rows] = await Promise.all([
    users(l.league_id),
    rosters(l.league_id),
    winnersBracket(l.status === "in_season", l.league_id),
    Promise.all(weeks.map((w) => leagueMatchups(w, false, false, l.league_id))),
  ]);
  const standings = sortStandings(r);
  const seeds = playoffSeeds(standings);
  return {
    league: l,
    users: u,
    rosters: r,
    standings,
    seeds,
    finish: finishOrder(fromSleeper(bracket, seeds), seeds),
    games: seasonGames(l, rows, bracket),
  };
}

// Every season in the chain, newest first. A season that hasn't drafted has
// no games and is left out.
export async function loadHistory(): Promise<Season[]> {
  const [chain, nfl] = await Promise.all([leagueChain(), nflState()]);
  const played = chain.filter((l) => l.status !== "pre_draft" && l.status !== "drafting");
  return Promise.all(played.map((l) => loadSeason(l, lastFinishedWeek(nfl, l.season))));
}

const resource = sharedResource(async () => ({ status: "ok" as const, seasons: await loadHistory() }));
export const useHistory = resource.use;

export const seasonTeam = (s: Season, rosterId: number): Team =>
  teamOf(s.users, s.rosters.find((r) => r.roster_id === rosterId), rosterId);

export interface Rivalry {
  opponent: number;
  wins: number;
  losses: number;
  ties: number;
  pf: number;
  pa: number;
  games: number;
}

// One franchise's record against each other roster, regular season and
// playoffs, across every season. Roster ids carry over from season to season.
export function headToHead(games: PastGame[], rosterId: number): Rivalry[] {
  const by = new Map<number, Rivalry>();
  for (const g of games) {
    if (g.kind === "consolation") continue;
    const me = g.sides.find((s) => s.rosterId === rosterId);
    const them = g.sides.find((s) => s.rosterId !== rosterId);
    if (!me || !them) continue;
    const r = by.get(them.rosterId) ?? { opponent: them.rosterId, wins: 0, losses: 0, ties: 0, pf: 0, pa: 0, games: 0 };
    r.games++;
    r.pf += me.points;
    r.pa += them.points;
    if (me.points > them.points) r.wins++;
    else if (me.points < them.points) r.losses++;
    else r.ties++;
    by.set(them.rosterId, r);
  }
  return [...by.values()].sort((a, b) => b.wins - b.losses - (a.wins - a.losses) || a.opponent - b.opponent);
}
