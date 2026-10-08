"use client";

import { useMemo } from "react";

import { values as valuesResource } from "@/lib/analyzer/values";
import { currentRosters } from "@/lib/league/cache";
import type { LeagueData } from "@/lib/league/use-league";
import { useLoad } from "@/lib/use-load";
import { useWeekBoard } from "./use-lineup";
import { type Pickup, suggestPickups } from "./waivers";

export type WaiverState =
  | { status: "off"; reason: "offseason" | "unlinked" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ok"; picks: Pickup[]; closed: "kickoff" | "season" | null };

// Free-agent pickups for the member's team, from every CLT roster as Sleeper has it now.
export function useWaivers(data: LeagueData | null, rosterId: number | null): { state: WaiverState; retry: () => void } {
  const { week, slots, board, kickedOff, players, error, retry } = useWeekBoard(data);
  const values = valuesResource.use();
  const [rosters, retryRosters] = useLoad(() => currentRosters(), "now");

  const state = useMemo((): WaiverState => {
    if (data && data.league.status !== "in_season") return { status: "off", reason: "offseason" };
    if (data && rosterId === null) return { status: "off", reason: "unlinked" };
    const failed = error ?? (values.status === "error" ? values.message : rosters.status === "error" ? rosters.message : null);
    if (failed) return { status: "error", message: failed };
    if (!data || !board || !players || week === null || values.status !== "ok" || rosters.status !== "ok" || rosterId === null) {
      return { status: "loading" };
    }
    const rosterSize = data.league.roster_positions.filter((p) => p !== "IR" && p !== "TAXI").length;
    const picks = suggestPickups({ rosterId, rosters: rosters.value, players, values: values.values, week: board, slots, rosterSize });
    // Add/drops end with the regular season.
    const closed = week >= data.league.settings.playoff_week_start ? "season" : kickedOff ? "kickoff" : null;
    return { status: "ok", picks, closed };
  }, [data, rosterId, error, values, rosters, board, players, week, slots, kickedOff]);

  return {
    state,
    retry: () => {
      if (values.status === "error") valuesResource.refresh();
      retryRosters();
      retry();
    },
  };
}
