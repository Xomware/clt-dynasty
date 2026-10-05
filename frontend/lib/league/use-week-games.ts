"use client";

import { useMemo } from "react";

import type { SleeperMatchup } from "@/lib/sleeper/types";
import { leagueWeek } from "./default-week";
import { useLeague } from "./use-league";

export interface Starter {
  slot: string;
  playerId: string | null;
  points: number;
}

export interface Benched {
  playerId: string;
  points: number;
}

export interface Side {
  rosterId: number;
  points: number;
  // Both null when Sleeper has no lineup for the team.
  starters: Starter[] | null;
  bench: Benched[] | null;
}

export interface Game {
  id: number;
  sides: Side[];
}

const NOT_STARTING = new Set(["BN", "IR", "TAXI", "RES"]);

export const startingSlots = (rosterPositions: string[]) => rosterPositions.filter((p) => !NOT_STARTING.has(p));

// A week's rows paired into games, each side with its lineup in slot order.
export function weekGames(rows: SleeperMatchup[], slots: string[]): Game[] {
  const byId = new Map<number, Side[]>();
  for (const m of rows) {
    if (m.matchup_id === null) continue;
    const starters = m.starters;
    const side: Side = {
      rosterId: m.roster_id,
      points: m.points,
      starters:
        starters?.map((raw, i) => ({
          slot: slots[i] ?? "",
          playerId: raw && raw !== "0" ? raw : null,
          points: m.starters_points[i] ?? 0,
        })) ?? null,
      bench: starters
        ? (m.players ?? [])
            .filter((id) => !starters.includes(id))
            .map((id) => ({ playerId: id, points: m.players_points?.[id] ?? 0 }))
            .sort((a, b) => b.points - a.points)
        : null,
    };
    byId.set(m.matchup_id, [...(byId.get(m.matchup_id) ?? []), side]);
  }
  return [...byId].sort(([a], [b]) => a - b).map(([id, sides]) => ({ id, sides }));
}

export function useWeekGames(week: number | undefined) {
  const { data, matchups, error, teamFor, myRosterId } = useLeague(week);
  const current = data ? leagueWeek(data.league, data.nfl) : undefined;
  const games = useMemo(
    () => (data && matchups ? weekGames(matchups, startingSlots(data.league.roster_positions)) : null),
    [data, matchups],
  );
  return { data, games, current, error, teamFor, myRosterId };
}
