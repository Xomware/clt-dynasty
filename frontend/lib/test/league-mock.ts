import { vi } from "vitest";

import { API_BASE, LEAGUE_ID } from "@/lib/config";
import { SLEEPER_BASE } from "@/lib/sleeper/client";
import type {
  SleeperBracketMatch,
  SleeperLeague,
  SleeperMatchup,
  SleeperNflState,
  SleeperRoster,
  SleeperUser,
} from "@/lib/sleeper/types";
import season from "./fixtures/league-2026.json";
import players from "./fixtures/players.json";

interface Season {
  state: SleeperNflState;
  league: SleeperLeague;
  users: SleeperUser[];
  rosters: SleeperRoster[];
  winners_bracket: SleeperBracketMatch[];
  losers_bracket: SleeperBracketMatch[];
  matchups: Record<string, SleeperMatchup[]>;
}

// Real 2026 Sleeper data from the evening of week 4's Monday game, with
// managers replaced by their roster ids: user "u<id>", team "Team <id>".
export const fixture = season as unknown as Season;
const current = fixture;

const league = `/league/${LEAGUE_ID}`;

const RESPONSES: Record<string, unknown> = {
  [league]: current.league,
  [`${league}/users`]: current.users,
  [`${league}/rosters`]: current.rosters,
  [`${league}/winners_bracket`]: current.winners_bracket,
  [`${league}/losers_bracket`]: current.losers_bracket,
  "/state/nfl": current.state,
  ...Object.fromEntries(Object.entries(current.matchups).map(([w, rows]) => [`${league}/matchups/${w}`, rows])),
  [`${API_BASE}/players/list`]: { count: Object.keys(players).length, players },
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

// Answers Sleeper paths (relative to its base) and Xomper URLs (absolute)
// from `extra` first, then the fixture. A function in `extra` returns its own
// Response, for failures. A spy rather than vi.stubGlobal, so
// restoreAllMocks undoes it.
export function stubSleeper(extra: Record<string, unknown> = {}) {
  const routes = { ...RESPONSES, ...extra };
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = String(input);
    const path = url.startsWith(SLEEPER_BASE) ? url.slice(SLEEPER_BASE.length) : url;
    if (!(path in routes)) return json({ message: `unmocked ${path}` }, 404);
    const body = routes[path];
    return typeof body === "function" ? (body as () => Response)() : json(body);
  });
}

export const calls = (suffix: string) =>
  vi.mocked(fetch).mock.calls.filter(([url]) => String(url).endsWith(suffix)).length;
