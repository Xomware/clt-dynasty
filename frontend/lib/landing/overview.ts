import { finishOrder, fromSleeper } from "@/lib/league/brackets";
import { drafts, nflState, rosters, users, winnersBracket } from "@/lib/league/cache";
import { leagueWeek } from "@/lib/league/default-week";
import { latestDraft } from "@/lib/league/drafts";
import { leagueChain } from "@/lib/league/history";
import { divisionName, playoffSeeds, sortStandings } from "@/lib/league/standings";
import { teamOf, type Team } from "@/lib/league/use-league";
import { sharedResource } from "@/lib/shared-resource";
import type { SleeperDraft, SleeperLeague, SleeperNflState } from "@/lib/sleeper/types";

export interface Seed {
  seed: number;
  team: Team;
  record: string;
  pf: number;
  division: string;
}

export interface Champion {
  season: string;
  champion: Team;
  runnerUp: Team | null;
}

export interface DraftNote {
  label: string;
  detail: string;
}

export interface Overview {
  season: string;
  phase: string;
  live: boolean;
  // The six playoff seeds as of today; null until a game is played.
  seeds: Seed[] | null;
  // Newest first.
  champions: Champion[];
  draft: DraftNote | null;
}

const date = (ms: number) =>
  new Date(ms).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export function phaseOf(l: SleeperLeague, nfl: SleeperNflState): { phase: string; live: boolean } {
  if (l.status === "pre_draft") return { phase: `Offseason: the ${l.season} draft is next`, live: false };
  if (l.status === "drafting") return { phase: `The ${l.season} draft is on`, live: true };
  if (l.status === "complete") return { phase: `The ${l.season} season is complete`, live: false };
  if (nfl.season_type === "pre") return { phase: `${l.season} preseason`, live: false };
  const week = leagueWeek(l, nfl);
  const start = l.settings.playoff_week_start;
  if (week >= start) return { phase: `Playoffs, round ${week - start + 1}`, live: true };
  return { phase: `Week ${week} of ${start - 1}`, live: true };
}

export function draftNote(list: SleeperDraft[]): DraftNote | null {
  const next = list.find((d) => d.status === "pre_draft" || d.status === "drafting" || d.status === "paused");
  if (next?.status === "drafting") return { label: "Draft", detail: "On the clock now" };
  if (next) return { label: "Next draft", detail: next.start_time ? date(next.start_time) : "Date not set yet" };
  const last = latestDraft(list);
  if (!last?.start_time) return null;
  return { label: "Last draft", detail: `${date(last.start_time)}, ${last.settings.rounds} rounds` };
}

async function champion(l: SleeperLeague): Promise<Champion | null> {
  const [u, r, bracket] = await Promise.all([users(l.league_id), rosters(l.league_id), winnersBracket(false, l.league_id)]);
  const seeds = playoffSeeds(sortStandings(r));
  const finish = finishOrder(fromSleeper(bracket, seeds), seeds);
  if (!finish) return null;
  const team = (id: number) => teamOf(u, r.find((x) => x.roster_id === id), id);
  return { season: l.season, champion: team(finish[0]), runnerUp: finish[1] ? team(finish[1]) : null };
}

export async function loadOverview(): Promise<Overview> {
  const [chain, nfl] = await Promise.all([leagueChain(), nflState()]);
  const l = chain[0];
  const [u, r, d, crowns] = await Promise.all([
    users(),
    rosters(),
    drafts(),
    Promise.all(chain.filter((x) => x.status === "complete").map(champion)),
  ]);

  const standings = sortStandings(r);
  const played = standings.some((s) => s.wins + s.losses + s.ties > 0);
  const seeds = playoffSeeds(standings)
    .slice(0, l.settings.playoff_teams)
    .map((id, i): Seed => {
      const s = standings.find((x) => x.rosterId === id)!;
      return {
        seed: i + 1,
        team: teamOf(u, r.find((x) => x.roster_id === id), id),
        record: `${s.wins}-${s.losses}${s.ties ? `-${s.ties}` : ""}`,
        pf: s.pf,
        division: divisionName(l, s.division),
      };
    });

  return {
    season: l.season,
    ...phaseOf(l, nfl),
    seeds: played && l.status === "in_season" ? seeds : null,
    champions: crowns.filter((c) => c !== null),
    draft: draftNote(d),
  };
}

const resource = sharedResource(async () => ({ status: "ok" as const, overview: await loadOverview() }));
export const useOverview = resource.use;
export const refreshOverview = resource.refresh;
