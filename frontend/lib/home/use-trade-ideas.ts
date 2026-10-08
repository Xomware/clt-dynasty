"use client";

import { useMemo } from "react";

import { analyze } from "@/lib/analyzer/analysis";
import { recommendTrades } from "@/lib/analyzer/trades";
import { values as valuesResource } from "@/lib/analyzer/values";
import { LEAGUE_ID } from "@/lib/config";
import { refreshPlayers, usePlayers } from "@/lib/league/players";
import { loadLeagueData } from "@/lib/team/data";
import { useLoad } from "@/lib/use-load";

export type TradeState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ok"; ideas: ReturnType<typeof recommendTrades> };

// The Team Analyzer's trade recommendations for one team, its top three.
export function useTradeIdeas(rosterId: number | null): { state: TradeState; retry: () => void } {
  const [league, retryLeague] = useLoad(() => loadLeagueData(LEAGUE_ID), LEAGUE_ID);
  const players = usePlayers();
  const values = valuesResource.use();

  const state = useMemo((): TradeState => {
    const failed = league.status === "error" ? league : players.status === "error" ? players : values.status === "error" ? values : null;
    if (failed) return { status: "error", message: failed.message };
    if (league.status !== "ok" || players.status !== "ok" || values.status !== "ok" || rosterId === null) return { status: "loading" };
    const { rosters, users } = league.value;
    const teams = rosters.map((r) => analyze(r, users, players.players, values.values));
    const me = teams.find((t) => t.rosterId === rosterId);
    if (!me) return { status: "loading" };
    return { status: "ok", ideas: recommendTrades(me, teams, rosters, players.players, values.values, 3) };
  }, [league, players, values, rosterId]);

  return {
    state,
    retry: () => {
      if (values.status === "error") valuesResource.refresh();
      if (players.status === "error") refreshPlayers();
      retryLeague();
    },
  };
}
