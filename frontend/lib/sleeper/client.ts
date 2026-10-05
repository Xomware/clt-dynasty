import type {
  SleeperBracketMatch,
  SleeperLeague,
  SleeperMatchup,
  SleeperNflState,
  SleeperRoster,
  SleeperUser,
} from "./types";

export const SLEEPER_BASE = "https://api.sleeper.app/v1";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${SLEEPER_BASE}${path}`);
  if (!res.ok) throw new Error(`Sleeper ${path}: ${res.status}`);
  return (await res.json()) as T;
}

// Every season is its own Sleeper league, so each call names one.
export const getLeague = (id: string) => get<SleeperLeague>(`/league/${id}`);
export const getUsers = (id: string) => get<SleeperUser[]>(`/league/${id}/users`);
export const getRosters = (id: string) => get<SleeperRoster[]>(`/league/${id}/rosters`);
export const getMatchups = (id: string, week: number) => get<SleeperMatchup[]>(`/league/${id}/matchups/${week}`);
export const getWinnersBracket = (id: string) => get<SleeperBracketMatch[]>(`/league/${id}/winners_bracket`);
export const getNflState = () => get<SleeperNflState>("/state/nfl");
