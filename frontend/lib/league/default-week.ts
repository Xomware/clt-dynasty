"use client";

import { useEffect, useState } from "react";

import type { SleeperLeague, SleeperMatchup, SleeperNflState } from "@/lib/sleeper/types";
import { leagueMatchups } from "./cache";
import type { LeagueData } from "./use-league";

// One week per playoff round, so a 6-team bracket ends two weeks after it starts.
export const lastLeagueWeek = (league: SleeperLeague) =>
  league.settings.playoff_week_start + Math.ceil(Math.log2(Math.max(2, league.settings.playoff_teams))) - 1;

// The latest week the league has: Sleeper's NFL week in season, the final
// playoff week once the league is complete.
export function leagueWeek(league: SleeperLeague, nfl: SleeperNflState): number {
  const last = lastLeagueWeek(league);
  if (league.status === "complete") return last;
  return Math.min(Math.max(1, nfl.week), last);
}

// Sleeper moves to the new week days before it kicks off. Until somebody in
// the league scores, the week worth looking at is the one that just ended.
export function defaultWeek(week: number, rows: SleeperMatchup[]): number {
  return week > 1 && !rows.some((r) => r.points > 0) ? week - 1 : week;
}

// Follows nfl/state as useLeague re-reads it, so a tab left open across
// Thursday kickoff moves to the new week.
export function useDefaultWeek(data: LeagueData | null): number | undefined {
  const [week, setWeek] = useState<number>();
  const current = data ? leagueWeek(data.league, data.nfl) : undefined;

  useEffect(() => {
    if (current === undefined) return;
    let live = true;
    leagueMatchups(current, true)
      .then((rows) => defaultWeek(current, rows))
      // The window shows a matchups failure itself; the latest week is the best guess meanwhile.
      .catch(() => current)
      .then((w) => live && setWeek(w));
    return () => {
      live = false;
    };
  }, [current]);

  return week;
}
