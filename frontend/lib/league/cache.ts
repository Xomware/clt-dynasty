import { LEAGUE_ID } from "@/lib/config";
import {
  getAccount,
  getDraftPicks,
  getDrafts,
  getLeague,
  getMatchups,
  getNflState,
  getPlayer,
  getPlayerStats,
  getRosters,
  getSchedule,
  getTradedPicks,
  getTransactions,
  getUserLeagues,
  getUsers,
  getWinnersBracket,
} from "@/lib/sleeper/client";
import type { SleeperMatchup } from "@/lib/sleeper/types";

// Every window reads the same league, so one promise per endpoint serves the
// whole session. Finished weeks never change (stat corrections are ignored);
// the live week and nfl/state do, so they expire.
const LIVE_TTL = 30_000;
const NFL_TTL = 5 * 60_000;

interface Entry {
  promise: Promise<unknown>;
  expires: number;
}

const entries = new Map<string, Entry>();
// The last value each key resolved to, for window titles, which read synchronously.
const values = new Map<string, unknown>();
const listeners = new Set<() => void>();
let version = 0;

function cached<T>(key: string, load: () => Promise<T>, ttl = Infinity): Promise<T> {
  const hit = entries.get(key);
  if (hit && hit.expires > Date.now()) return hit.promise as Promise<T>;
  const promise = load();
  const entry = { promise, expires: Date.now() + ttl };
  entries.set(key, entry);
  promise.then(
    (value) => {
      values.set(key, value);
      version++;
      listeners.forEach((fn) => fn());
    },
    // A failure is dropped so the next caller retries instead of reusing the rejection.
    () => entries.get(key) === entry && entries.delete(key),
  );
  return promise;
}

export const settled = <T>(key: string) => values.get(key) as T | undefined;
export const settledVersion = () => version;
export function subscribeSettled(fn: () => void) {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}

// Past seasons pass their own league id; everything else reads the current one.
export const league = (id = LEAGUE_ID) => cached(`league/${id}`, () => getLeague(id));
export const users = (id = LEAGUE_ID) => cached(`users/${id}`, () => getUsers(id));
export const rosters = (id = LEAGUE_ID) => cached(`rosters/${id}`, () => getRosters(id));
// Sleeper redraws the bracket from the standings each week until the playoffs start.
export const winnersBracket = (live: boolean, id = LEAGUE_ID) =>
  cached(`winners/${id}`, () => getWinnersBracket(id), live ? LIVE_TTL : Infinity);

export const drafts = (id = LEAGUE_ID) => cached(`drafts/${id}`, () => getDrafts(id));
export const tradedPicks = (id = LEAGUE_ID) => cached(`traded/${id}`, () => getTradedPicks(id));
// A finished draft's picks never change; one under way gains a pick every few minutes.
export function draftPicks(draftId: string, live: boolean, fresh = false) {
  const key = `picks/${draftId}`;
  if (fresh) entries.delete(key);
  return cached(key, () => getDraftPicks(draftId), live ? LIVE_TTL : Infinity);
}

// Search and profiles look up any Sleeper user, not only CLT's managers.
export const account = (nameOrId: string) => cached(`account/${nameOrId.toLowerCase()}`, () => getAccount(nameOrId.toLowerCase()));
export const userLeagues = (userId: string, season: string) => cached(`leagues/${userId}/${season}`, () => getUserLeagues(userId, season));

export function nflState(fresh = false) {
  if (fresh) entries.delete("nfl");
  return cached("nfl", getNflState, NFL_TTL);
}

export function leagueMatchups(week: number, live: boolean, fresh = false, id = LEAGUE_ID): Promise<SleeperMatchup[]> {
  const key = `matchups/${id}/${week}`;
  if (fresh) entries.delete(key);
  return cached(key, () => getMatchups(id, week), live ? LIVE_TTL : Infinity);
}

// A finished week's moves are settled; the live week's waivers and adds keep landing.
export const transactions = (week: number, live: boolean) =>
  cached(`transactions/${LEAGUE_ID}/${week}`, () => getTransactions(LEAGUE_ID, week), live ? LIVE_TTL : Infinity);

// Injuries, depth charts and stat lines move during the week; five minutes is fresh enough for a profile.
export const player = (id: string) => cached(`player/${id}`, () => getPlayer(id), NFL_TTL);
export const playerStats = (id: string, season: string) => cached(`stats/${season}/${id}`, () => getPlayerStats(id, season), NFL_TTL);
export const nflSchedule = (season: string) => cached(`schedule/${season}`, () => getSchedule(season), NFL_TTL);

export function clearLeagueCache() {
  entries.clear();
  values.clear();
}
