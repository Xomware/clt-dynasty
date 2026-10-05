import { request } from "./client";

// GET /clt/me (xomper-back-end api_clt_me). `member.sleeperUserId` is the
// roster mapping; `linkedSleeperUserId` is what the caller linked through
// /me/sleeper-link. Either is "" when unset.
export interface CltMe {
  member: {
    email: string;
    displayName: string;
    role: string;
    sleeperUserId: string;
  };
  linkedSleeperUserId: string;
}

export const getCltMe = () => request<CltMe>("/clt/me");

// GET /clt/world-cup (api_clt_worldcup): divisional records across every
// season, keyed by Sleeper user. Teams arrive sorted; the top two qualify.
export interface WorldCupTeam {
  userId: string;
  username: string;
  teamName: string;
  wins: number;
  losses: number;
  ties: number;
  pointsFor: number;
  pointsAgainst: number;
  status: "alive" | "clinched" | "eliminated";
}

export interface WorldCupDivision {
  division: number;
  name: string;
  gamesRemaining: number;
  teams: WorldCupTeam[];
}

export interface WorldCup {
  leagueId: string;
  season: string;
  divisions: WorldCupDivision[];
}

export const getWorldCup = () => request<WorldCup>("/clt/world-cup");
