"use client";

import { useMemo } from "react";

import { values } from "@/lib/analyzer/values";
import { league, nflState, projections, seasonStats } from "@/lib/league/cache";
import { sharedResource } from "@/lib/shared-resource";
import type { SleeperStatRow } from "@/lib/sleeper/types";
import { type DynastyRank, dynastyRanks, type PositionRank, positionRanks } from "./ranks";

const settle = <T>(p: Promise<T>) =>
  p.then(
    (v) => v,
    (e: Error) => e,
  );

// Season and projected ranks in CLT scoring. Each source fails alone: a
// projection outage still leaves the season ranks.
const sleeperRanks = sharedResource(async () => {
  const [lg, nfl] = await Promise.all([league(), nflState()]);
  const week = Math.max(1, nfl.week);
  const inSeason = lg.status === "in_season";
  const [season, projected] = await Promise.all([settle(seasonStats(lg.season)), inSeason ? settle(projections(lg.season, week)) : Promise.resolve(null)]);
  const ranks = (rows: SleeperStatRow[] | Error | null) => (rows === null || rows instanceof Error ? null : positionRanks(rows, lg.scoring_settings));
  return {
    status: "ok" as const,
    season: lg.season,
    week: inSeason ? week : null,
    seasonRanks: ranks(season),
    projected: ranks(projected),
  };
}, 5 * 60_000);

export interface PlayerRanks {
  season: PositionRank | null;
  projected: PositionRank | null;
  dynasty: DynastyRank | null;
}

export type RankLookup = ((id: string) => PlayerRanks) & { season: string | null; week: number | null; ready: boolean };

// Every rank for any player id; empty until the sources land, so callers render at once.
export function useRanks(): RankLookup {
  const sleeper = sleeperRanks.use();
  const fc = values.use();
  const dynasty = useMemo(() => (fc.status === "ok" ? dynastyRanks(fc.values) : null), [fc]);
  return useMemo(() => {
    const s = sleeper.status === "ok" ? sleeper : null;
    const lookup = (id: string): PlayerRanks => ({
      season: s?.seasonRanks?.get(id) ?? null,
      projected: s?.projected?.get(id) ?? null,
      dynasty: dynasty?.get(id) ?? null,
    });
    return Object.assign(lookup, { season: s?.season ?? null, week: s?.week ?? null, ready: s !== null });
  }, [sleeper, dynasty]);
}
