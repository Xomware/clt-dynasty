"use client";

import { useMember } from "@/lib/member/use-member";
import {
  getLeague,
  getLeagueRosters,
  getLeagueUsers,
  type SleeperLeague,
  type SleeperRoster,
  type SleeperUser,
} from "@/lib/sleeper/league";

export interface LeagueData {
  league: SleeperLeague;
  users: SleeperUser[];
  rosters: SleeperRoster[];
}

export const loadLeagueData = async (leagueId: string): Promise<LeagueData> => {
  const [league, users, rosters] = await Promise.all([getLeague(leagueId), getLeagueUsers(leagueId), getLeagueRosters(leagueId)]);
  return { league, users, rosters };
};

// The account they linked in Settings, else the one the roster lists for
// them: the same order as lib/league/use-league's myRosterId.
export function useMySleeperId(): string {
  const { state } = useMember();
  if (state.status !== "member") return "";
  return state.me.linkedSleeperUserId || state.me.member.sleeperUserId;
}
