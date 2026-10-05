import { LEAGUE_ID } from "@/lib/config";
import type { WindowLink } from "@/lib/desktop/deep-link";
import type { ViewParams } from "@/lib/view-params";

// CLT's own teams link by roster alone, like the league windows' drills.
export const teamLink = (leagueId: string, rosterId: number): WindowLink => ({
  kind: "team",
  params: leagueId === LEAGUE_ID ? { rosterId } : { leagueId, rosterId },
});

export const profileLink = (userId: string): WindowLink => ({ kind: "profile", params: { userId } });

export const leagueLink = (leagueId: string): WindowLink => ({ kind: "league", params: { leagueId } });

const ID = /^\d+$/;
const ROSTER = /^[1-9]\d*$/;

// `?open=team:4` is a CLT team; `team:<leagueId>:4` one in another league.
export function readTeamLink(value: string): ViewParams | null {
  const [a, b] = value.split(":");
  if (b === undefined) return ROSTER.test(a) ? { rosterId: Number(a) } : null;
  return ID.test(a) && ROSTER.test(b) ? { leagueId: a, rosterId: Number(b) } : null;
}

export const readIdLink = (key: string) => (value: string) => (ID.test(value) ? { [key]: value } : null);
