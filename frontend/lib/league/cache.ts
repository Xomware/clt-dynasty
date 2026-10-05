import { LEAGUE_ID } from "@/lib/config";
import { getLeague, getMatchups, getNflState, getRosters, getUsers } from "@/lib/sleeper/client";
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

function cached<T>(key: string, load: () => Promise<T>, ttl = Infinity): Promise<T> {
  const hit = entries.get(key);
  if (hit && hit.expires > Date.now()) return hit.promise as Promise<T>;
  const promise = load();
  const entry = { promise, expires: Date.now() + ttl };
  entries.set(key, entry);
  // A failure is dropped so the next caller retries instead of reusing the rejection.
  promise.catch(() => entries.get(key) === entry && entries.delete(key));
  return promise;
}

// Past seasons pass their own league id; everything else reads the current one.
export const league = (id = LEAGUE_ID) => cached(`league/${id}`, () => getLeague(id));
export const users = (id = LEAGUE_ID) => cached(`users/${id}`, () => getUsers(id));
export const rosters = (id = LEAGUE_ID) => cached(`rosters/${id}`, () => getRosters(id));

export function nflState(fresh = false) {
  if (fresh) entries.delete("nfl");
  return cached("nfl", getNflState, NFL_TTL);
}

export function leagueMatchups(week: number, live: boolean, fresh = false, id = LEAGUE_ID): Promise<SleeperMatchup[]> {
  const key = `matchups/${id}/${week}`;
  if (fresh) entries.delete(key);
  return cached(key, () => getMatchups(id, week), live ? LIVE_TTL : Infinity);
}

export function clearLeagueCache() {
  entries.clear();
}
