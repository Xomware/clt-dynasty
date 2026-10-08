import { leagueMatchups, league, nflState, rosters, users } from "@/lib/league/cache";
import { defaultWeek, leagueWeek } from "@/lib/league/default-week";
import { teamOf, type Team } from "@/lib/league/use-league";
import { startingSlots, weekGames } from "@/lib/league/use-week-games";

export interface IntroSide extends Team {
  points: number;
}

export interface IntroWeek {
  /** What the intro's board says over the games, e.g. "WEEK 6 LIVE". */
  label: string;
  games: [IntroSide, IntroSide][];
}

/**
 * The league's games for the intro's scoreboard: the live week, or the one
 * that just ended until somebody scores. Null outside the season. Read through
 * the shared cache, so the page under the intro gets these requests for free.
 */
export async function introWeek(): Promise<IntroWeek | null> {
  const [l, u, r, nfl] = await Promise.all([league(), users(), rosters(), nflState()]);
  if (l.status !== "in_season" && l.status !== "complete") return null;
  const current = leagueWeek(l, nfl);
  const live = l.status === "in_season";
  const latest = await leagueMatchups(current, live);
  const week = defaultWeek(current, latest);
  const rows = week === current ? latest : await leagueMatchups(week, false);

  const games = weekGames(rows, startingSlots(l.roster_positions))
    .filter((g) => g.sides.length === 2)
    .map((g) =>
      g.sides.map((s) => ({
        ...teamOf(
          u,
          r.find((x) => x.roster_id === s.rosterId),
          s.rosterId,
        ),
        points: s.points,
      })),
    ) as [IntroSide, IntroSide][];
  if (games.length === 0) return null;

  const playoffs = week >= l.settings.playoff_week_start;
  const name = playoffs ? `PLAYOFFS WK ${week}` : `WEEK ${week}`;
  return { label: `${name} ${live && week === current ? "LIVE" : "FINAL"}`, games };
}
