"use client";

import { league, rosters, users } from "@/lib/league/cache";
import { useMember } from "@/lib/member/use-member";
import type { SleeperLeague, SleeperRoster, SleeperUser } from "@/lib/sleeper/types";

export interface LeagueData {
  league: SleeperLeague;
  users: SleeperUser[];
  rosters: SleeperRoster[];
}

export const loadLeagueData = async (leagueId: string): Promise<LeagueData> => {
  const [l, u, r] = await Promise.all([league(leagueId), users(leagueId), rosters(leagueId)]);
  return { league: l, users: u, rosters: r };
};

// The account they linked in Settings, else the one the roster lists for
// them: the same order as lib/league/use-league's myRosterId.
export function useMySleeperId(): string {
  const { state } = useMember();
  if (state.status !== "member") return "";
  return state.me.linkedSleeperUserId || state.me.member.sleeperUserId;
}
