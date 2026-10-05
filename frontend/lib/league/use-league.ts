"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useMember } from "@/lib/member/use-member";
import { rosterOf } from "@/lib/sleeper/rosters";
import type { SleeperLeague, SleeperMatchup, SleeperNflState, SleeperRoster, SleeperUser } from "@/lib/sleeper/types";
import { league, leagueMatchups, rosters, users } from "./cache";
import { useNflState } from "./nfl-state";

export interface LeagueData {
  league: SleeperLeague;
  users: SleeperUser[];
  rosters: SleeperRoster[];
  nfl: SleeperNflState;
}

export interface Team {
  name: string;
  avatarUrl: string | null;
}

const POLL = 60_000;

async function loadLeague(): Promise<Omit<LeagueData, "nfl">> {
  const [l, u, r] = await Promise.all([league(), users(), rosters()]);
  return { league: l, users: u, rosters: r };
}

export function teamOf(users: SleeperUser[], roster: SleeperRoster | undefined, rosterId: number): Team {
  const user = users.find((u) => u.user_id === roster?.owner_id);
  return {
    name: user?.metadata?.team_name || user?.display_name || `Team ${rosterId}`,
    avatarUrl: user?.avatar ? `https://sleepercdn.com/avatars/thumbs/${user.avatar}` : null,
  };
}

// Reads the shared league cache, plus matchups for `week` whenever it is set.
// nfl/state is re-read while mounted, so the live week moves with Sleeper.
// The live week polls, and refresh() refetches it now.
export function useLeague(week?: number) {
  const [base, setBase] = useState<Omit<LeagueData, "nfl"> | null>(null);
  const state = useNflState();
  const nfl = state.status === "ok" ? state.nfl : null;
  const data = useMemo(() => (base && nfl ? { ...base, nfl } : null), [base, nfl]);
  const [matchups, setMatchups] = useState<{ week: number; rows: SleeperMatchup[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reload = useRef(() => {});
  const member = useMember().state;

  useEffect(() => {
    let live = true;
    loadLeague()
      .then((d) => live && setBase(d))
      .catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, []);

  // Waits for nfl/state and the league to know whether `week` is live. Every
  // caller sets `week` from those, so this adds no round trip in practice.
  const liveWeek = nfl?.week;
  const status = base?.league.status;
  useEffect(() => {
    if (week === undefined || liveWeek === undefined || status === undefined) return;
    let mounted = true;
    const live = status === "in_season" && week >= liveWeek;
    const load = (fresh: boolean) =>
      leagueMatchups(week, live, fresh)
        .then((rows) => mounted && setMatchups({ week, rows }))
        .catch((e: Error) => mounted && setError(e.message));
    load(false);
    reload.current = () => void load(true);
    const timer = live ? setInterval(() => load(false), POLL) : undefined;
    return () => {
      mounted = false;
      clearInterval(timer);
      reload.current = () => {};
    };
  }, [week, liveWeek, status]);

  const refresh = useCallback(() => reload.current(), []);

  const teamFor = useCallback(
    (rosterId: number): Team =>
      teamOf(data?.users ?? [], data?.rosters.find((r) => r.roster_id === rosterId), rosterId),
    [data],
  );

  // The account they linked in Settings, else the one the roster lists for them.
  const sleeperId = member.status === "member" ? member.me.linkedSleeperUserId || member.me.member.sleeperUserId : "";
  const myRosterId = data && sleeperId ? rosterOf(data.rosters, sleeperId) : null;

  return {
    data,
    // Stale rows from the previous week never render under the new week's label.
    matchups: matchups && matchups.week === week ? matchups.rows : null,
    error: error ?? (state.status === "error" ? state.message : null),
    teamFor,
    myRosterId,
    refresh,
  };
}
