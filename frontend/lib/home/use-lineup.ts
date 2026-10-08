"use client";

import { useMemo } from "react";

import { currentRosters, nflSchedule, projections } from "@/lib/league/cache";
import { leagueWeek } from "@/lib/league/default-week";
import { usePlayers } from "@/lib/league/players";
import type { LeagueData } from "@/lib/league/use-league";
import { startingSlots } from "@/lib/league/use-week-games";
import { useLoad } from "@/lib/use-load";
import { checkLineup, type LineupCheck, slotPositions } from "./lineup";
import { type PlayerWeek, weekBoard } from "./projections";

export type LineupState =
  | { status: "off"; reason: "offseason" | "unlinked" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ok"; week: number; check: LineupCheck; player: (id: string) => PlayerWeek };

// This week's projections, injuries and byes for every position a lineup can start.
export function useWeekBoard(data: LeagueData | null) {
  const inSeason = data?.league.status === "in_season";
  const week = data && inSeason ? leagueWeek(data.league, data.nfl) : null;
  const season = data?.league.season ?? "";
  const slots = useMemo(() => startingSlots(data?.league.roster_positions ?? []), [data]);
  const positions = [...new Set(slots.flatMap(slotPositions))].sort();
  const players = usePlayers();
  const [load, retry] = useLoad(
    () => (week === null ? Promise.resolve(null) : Promise.all([projections(season, week, positions), nflSchedule(season)])),
    `${season}/${week}/${positions.join(",")}`,
  );

  const board = useMemo(() => {
    if (!data || week === null || load.status !== "ok" || !load.value || players.status !== "ok") return null;
    const [rows, games] = load.value;
    return weekBoard(rows, players.players, data.league.scoring_settings, games, week);
  }, [data, week, load, players]);

  // The rules close adds once the week's first game starts.
  const kickedOff = load.status === "ok" && !!load.value && load.value[1].some((g) => g.week === week && g.status !== "pre_game" && g.status !== "canceled");
  const error = load.status === "error" ? load.message : players.status === "error" ? players.message : null;
  return { week, slots, board, kickedOff, players: players.status === "ok" ? players.players : null, error, retry };
}

// The member's lineup as Sleeper has it right now, against this week's projections.
export function useLineup(data: LeagueData | null, rosterId: number | null) {
  const { week, slots, board, error, retry } = useWeekBoard(data);
  const [roster, retryRoster] = useLoad(() => currentRosters().then((all) => all.find((r) => r.roster_id === rosterId) ?? null), `now/${rosterId}`);

  const recheck = () => {
    void currentRosters(true);
    retryRoster();
    retry();
  };

  const state = useMemo((): LineupState => {
    if (data && data.league.status !== "in_season") return { status: "off", reason: "offseason" };
    if (data && rosterId === null) return { status: "off", reason: "unlinked" };
    const failed = error ?? (roster.status === "error" ? roster.message : null);
    if (failed) return { status: "error", message: failed };
    if (!board || week === null || roster.status !== "ok") return { status: "loading" };
    const r = roster.value;
    if (!r) return { status: "off", reason: "unlinked" };
    const sidelined = new Set([...(r.taxi ?? []), ...(r.reserve ?? []), ...r.starters]);
    const bench = (r.players ?? []).filter((id) => !sidelined.has(id));
    return { status: "ok", week, check: checkLineup(slots, r.starters, bench, board), player: board };
  }, [data, rosterId, error, roster, board, week, slots]);

  return { state, recheck };
}
