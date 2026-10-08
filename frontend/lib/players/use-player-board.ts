"use client";

import { useMemo } from "react";

import { values as valuesResource, valueOf } from "@/lib/analyzer/values";
import { scoreProjection } from "@/lib/home/projections";
import { useWeekBoard } from "@/lib/home/use-lineup";
import { currentRosters, projections, seasonStats } from "@/lib/league/cache";
import { lastLeagueWeek } from "@/lib/league/default-week";
import { refreshPlayers, usePlayers } from "@/lib/league/players";
import { useLeague } from "@/lib/league/use-league";
import { positionRanks } from "@/lib/nfl/ranks";
import type { SleeperStatRow } from "@/lib/sleeper/types";
import { useLoad } from "@/lib/use-load";
import { buildRows } from "./rows";

// Every fantasy player with his CLT owner, season, this week's projection and
// dynasty value. The rosters are Sleeper's as of now, not the session's first
// read, so "Available" means available. Projections, stats and values each
// fail alone and leave their columns empty.
export function usePlayerBoard(withRos: boolean) {
  const league = useLeague();
  const { data, myRosterId, teamFor } = league;
  const week = useWeekBoard(data);
  const players = usePlayers();
  const values = valuesResource.use();
  const season = data?.league.season ?? "";
  const [rosters, retryRosters] = useLoad(() => currentRosters(), "now");
  const [stats] = useLoad(() => (season ? seasonStats(season) : Promise.resolve(null)), `season/${season}`);
  const ros = useRos(data && week.week !== null ? { season, from: week.week + 1, to: lastLeagueWeek(data.league), scoring: data.league.scoring_settings } : null, withRos);

  const statRows = stats.status === "ok" ? stats.value : null;
  const scoring = data?.league.scoring_settings;
  const seasonLines = useMemo(() => {
    const lines = new Map<string, { points: number; rank: number; games: number }>();
    if (!scoring || !statRows) return lines;
    const games = new Map(statRows.map((r) => [r.player_id, r.stats.gp ?? 0]));
    for (const [id, r] of positionRanks(statRows, scoring)) {
      lines.set(id, { points: Math.round(r.points * 10) / 10, rank: r.rank, games: games.get(id) ?? 0 });
    }
    return lines;
  }, [statRows, scoring]);

  const rows = useMemo(() => {
    if (players.status !== "ok" || rosters.status !== "ok") return null;
    const v = values.status === "ok" ? values.values : null;
    const board = week.board;
    return buildRows({
      players: players.players,
      rosters: rosters.value,
      season: (id) => seasonLines.get(id) ?? null,
      proj: board ? (id) => board(id).points : null,
      ros: ros.status === "ok" ? ros.value : null,
      value: (id) => (v ? valueOf(v, id) : 0),
    });
  }, [players, rosters, values, week.board, seasonLines, ros]);

  const error = league.error ?? (players.status === "error" ? players.message : rosters.status === "error" ? rosters.message : null);
  const retry = () => {
    if (players.status === "error") refreshPlayers();
    retryRosters();
  };

  return {
    rows,
    error,
    retry,
    data,
    myRosterId,
    teamFor,
    rosters: rosters.status === "ok" ? rosters.value : null,
    week: week.week,
    slots: week.slots,
    board: week.board,
    kickedOff: week.kickedOff,
    values: values.status === "ok" ? values.values : null,
    players: players.status === "ok" ? players.players : null,
    // What the empty columns are missing.
    missing: {
      stats: stats.status === "error",
      proj: week.error !== null && players.status === "ok",
      values: values.status === "error",
      ros: ros.status === "error",
    },
    rosLoading: withRos && ros.status === "loading",
  };
}

export type PlayerBoard = ReturnType<typeof usePlayerBoard>;

interface RosRange {
  season: string;
  from: number;
  to: number;
  scoring: Record<string, number>;
}

// Each remaining week's projection averaged over the weeks he has one: a bye
// or a week ruled out doesn't drag him down. About 230 KB a week, so it loads
// only once someone sorts by it.
function useRos(range: RosRange | null, enabled: boolean) {
  const key = enabled && range ? `${range.season}/${range.from}-${range.to}` : "off";
  const [load] = useLoad(async () => {
    if (!enabled || !range || range.from > range.to) return null;
    const weeks: number[] = [];
    for (let w = range.from; w <= range.to; w++) weeks.push(w);
    return averages(await Promise.all(weeks.map((w) => projections(range.season, w))), range.scoring);
  }, key);
  return load;
}

export function averages(weeks: SleeperStatRow[][], scoring: Record<string, number>): Map<string, number> {
  const sums = new Map<string, { total: number; n: number }>();
  for (const rows of weeks) {
    for (const r of rows) {
      const points = scoreProjection(r.stats, scoring);
      if (points <= 0) continue;
      const s = sums.get(r.player_id) ?? { total: 0, n: 0 };
      s.total += points;
      s.n++;
      sums.set(r.player_id, s);
    }
  }
  return new Map([...sums].map(([id, s]) => [id, Math.round((s.total / s.n) * 10) / 10]));
}
