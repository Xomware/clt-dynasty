import { vi } from "vitest";

import { API_BASE } from "@/lib/config";
import { SLEEPER_BASE } from "@/lib/sleeper/client";
import type {
  SleeperBracketMatch,
  SleeperDraft,
  SleeperDraftPick,
  SleeperLeague,
  SleeperMatchup,
  SleeperNflState,
  SleeperRoster,
  SleeperTradedPick,
  SleeperUser,
} from "@/lib/sleeper/types";
import season from "./fixtures/league-2026.json";
import drafts from "./fixtures/drafts.json";
import past from "./fixtures/league-past.json";
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
// The two seasons before it, 2025 and 2024, by league id; their matchups keep
// only roster, game and points.
export const pastFixture = past as unknown as Record<string, Omit<Season, "state">>;

// Each season's drafts with their picks (none for the 30-round 2024 startup)
// and traded picks, by league id. Pickers are "u<roster_id>" too.
export const draftFixture = drafts as unknown as Record<
  string,
  { drafts: { draft: SleeperDraft; picks: SleeperDraftPick[] }[]; traded_picks: SleeperTradedPick[] }
>;

const draftRoutes = Object.entries(draftFixture).reduce(
  (all, [id, d]) => ({
    ...all,
    [`/league/${id}/drafts`]: d.drafts.map((x) => x.draft),
    [`/league/${id}/traded_picks`]: d.traded_picks,
    ...Object.fromEntries(d.drafts.map((x) => [`/draft/${x.draft.draft_id}/picks`, x.picks])),
  }),
  {},
);

const seasonRoutes = (s: Omit<Season, "state">) => {
  const league = `/league/${s.league.league_id}`;
  return {
    [league]: s.league,
    [`${league}/users`]: s.users,
    [`${league}/rosters`]: s.rosters,
    [`${league}/winners_bracket`]: s.winners_bracket,
    [`${league}/losers_bracket`]: s.losers_bracket,
    ...Object.fromEntries(Object.entries(s.matchups).map(([w, rows]) => [`${league}/matchups/${w}`, rows])),
  };
};

const RESPONSES: Record<string, unknown> = {
  ...seasonRoutes(fixture),
  ...Object.values(pastFixture).reduce((all, s) => ({ ...all, ...seasonRoutes(s) }), {}),
  ...draftRoutes,
  "/state/nfl": fixture.state,
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
