// Sleeper reads for any league or user, not just CLT's: profiles and search
// open other leagues too.
const BASE = "https://api.sleeper.app/v1";

export interface SleeperLeague {
  league_id: string;
  name: string;
  season: string;
  status: string;
  avatar: string | null;
  total_rosters: number;
  previous_league_id: string | null;
  roster_positions: string[];
  settings: { divisions?: number; playoff_teams?: number; [key: string]: unknown };
  // `division_1` and so on name the divisions.
  metadata: Record<string, string> | null;
}

export interface SleeperUser {
  user_id: string;
  display_name: string;
  avatar: string | null;
  metadata: { team_name?: string; [key: string]: unknown } | null;
}

// /user/<name or id> answers with the account's handle as well.
export interface SleeperAccount {
  user_id: string;
  username: string;
  display_name: string;
  avatar: string | null;
}

export interface SleeperRoster {
  roster_id: number;
  owner_id: string | null;
  co_owners: string[] | null;
  // Slot order follows the league's roster_positions; "0" is an empty slot.
  starters: string[] | null;
  players: string[] | null;
  taxi: string[] | null;
  reserve: string[] | null;
  settings: {
    wins: number;
    losses: number;
    ties: number;
    fpts?: number;
    fpts_decimal?: number;
    fpts_against?: number;
    fpts_against_decimal?: number;
    division?: number;
    [key: string]: unknown;
  };
  // `streak` reads like "3L" or "2W".
  metadata: { streak?: string; record?: string; [key: string]: unknown } | null;
}

export interface SleeperNflState {
  season: string;
  league_season?: string;
  week: number;
  season_type: string;
}

const entries = new Map<string, Promise<unknown>>();
// Settled values by key, read synchronously by window titles.
const settled = new Map<string, unknown>();
const listeners = new Set<() => void>();
let version = 0;

export class SleeperError extends Error {
  constructor(
    readonly status: number,
    path: string,
  ) {
    super(`Sleeper ${path} failed (${status})`);
    this.name = "SleeperError";
  }
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new SleeperError(res.status, path);
  return (await res.json()) as T;
}

// One request per path per session; a failure is dropped so the next caller retries.
function cached<T>(path: string): Promise<T> {
  const hit = entries.get(path);
  if (hit) return hit as Promise<T>;
  const promise = get<T>(path);
  entries.set(path, promise);
  promise.then(
    (value) => {
      settled.set(path, value);
      version++;
      listeners.forEach((fn) => fn());
    },
    () => entries.get(path) === promise && entries.delete(path),
  );
  return promise;
}

export const getLeague = (id: string) => cached<SleeperLeague>(`/league/${id}`);
export const getLeagueUsers = (id: string) => cached<SleeperUser[]>(`/league/${id}/users`);
export const getLeagueRosters = (id: string) => cached<SleeperRoster[]>(`/league/${id}/rosters`);
// Sleeper answers an unknown name or id with a 200 and `null`.
export const getAccount = (nameOrId: string) => cached<SleeperAccount | null>(`/user/${encodeURIComponent(nameOrId.toLowerCase())}`);
export const getUserLeagues = (userId: string, season: string) => cached<SleeperLeague[]>(`/user/${userId}/leagues/nfl/${season}`);
export const getNflState = () => cached<SleeperNflState>("/state/nfl");

export const loadedLeague = (id: string) => settled.get(`/league/${id}`) as SleeperLeague | undefined;
export const loadedUsers = (id: string) => settled.get(`/league/${id}/users`) as SleeperUser[] | undefined;
export const loadedRosters = (id: string) => settled.get(`/league/${id}/rosters`) as SleeperRoster[] | undefined;
export const loadedAccount = (id: string) => settled.get(`/user/${id}`) as SleeperAccount | null | undefined;

export const loadedVersion = () => version;
export function subscribeLoaded(fn: () => void) {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}

export function clearSleeperCache() {
  entries.clear();
  settled.clear();
}

export const avatarUrl = (avatar: string | null | undefined) => (avatar ? `https://sleepercdn.com/avatars/thumbs/${avatar}` : null);
