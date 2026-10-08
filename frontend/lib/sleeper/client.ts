import type {
  SleeperAccount,
  SleeperBracketMatch,
  SleeperDraft,
  SleeperDraftPick,
  SleeperGame,
  SleeperLeague,
  SleeperMatchup,
  SleeperNflState,
  SleeperPlayer,
  SleeperProjection,
  SleeperRoster,
  SleeperTradedPick,
  SleeperTransaction,
  SleeperUser,
  SleeperWeekStats,
} from "./types";

export const SLEEPER_BASE = "https://api.sleeper.app/v1";

export class SleeperError extends Error {
  constructor(
    readonly status: number,
    path: string,
  ) {
    super(`Sleeper ${path}: ${status}`);
    this.name = "SleeperError";
  }
}

// Sleeper's own site reads players, stats and the schedule from here; the
// documented v1 API has none of them. Both send CORS headers for any origin.
export const SLEEPER_WEB = "https://api.sleeper.com";

async function get<T>(path: string, base = SLEEPER_BASE): Promise<T> {
  const res = await fetch(`${base}${path}`);
  if (!res.ok) throw new SleeperError(res.status, path);
  return (await res.json()) as T;
}

// Every season is its own Sleeper league, so each call names one.
export const getLeague = (id: string) => get<SleeperLeague>(`/league/${id}`);
export const getUsers = (id: string) => get<SleeperUser[]>(`/league/${id}/users`);
export const getRosters = (id: string) => get<SleeperRoster[]>(`/league/${id}/rosters`);
export const getMatchups = (id: string, week: number) => get<SleeperMatchup[]>(`/league/${id}/matchups/${week}`);
export const getWinnersBracket = (id: string) => get<SleeperBracketMatch[]>(`/league/${id}/winners_bracket`);
export const getDrafts = (id: string) => get<SleeperDraft[]>(`/league/${id}/drafts`);
export const getDraftPicks = (draftId: string) => get<SleeperDraftPick[]>(`/draft/${draftId}/picks`);
export const getTradedPicks = (id: string) => get<SleeperTradedPick[]>(`/league/${id}/traded_picks`);
export const getTransactions = (id: string, week: number) =>
  get<SleeperTransaction[]>(`/league/${id}/transactions/${week}`);
export const getNflState = () => get<SleeperNflState>("/state/nfl");
// Sleeper answers an unknown name or id with a 200 and `null`.
export const getAccount = (nameOrId: string) => get<SleeperAccount | null>(`/user/${encodeURIComponent(nameOrId)}`);
export const getUserLeagues = (userId: string, season: string) => get<SleeperLeague[]>(`/user/${userId}/leagues/nfl/${season}`);

// An unknown id is a 200 and `null`.
export const getPlayer = (id: string) => get<SleeperPlayer | null>(`/players/nfl/${id}`, SLEEPER_WEB);
export const getPlayerStats = (id: string, season: string) =>
  get<Record<string, SleeperWeekStats | null>>(`/stats/nfl/player/${id}?season_type=regular&season=${season}&grouping=week`, SLEEPER_WEB);
export const getSchedule = (season: string) => get<SleeperGame[]>(`/schedule/nfl/regular/${season}`, SLEEPER_WEB);

// Neither under v1 nor documented; Sleeper's own app reads it, CORS open to any
// origin. Every position is 5.7 MB, so ask only for the ones a lineup can start.
export const getProjections = (season: string, week: number, positions: string[]) =>
  get<SleeperProjection[]>(
    `/projections/nfl/${season}/${week}?season_type=regular&${positions.map((p) => `position[]=${p}`).join("&")}`,
    "https://api.sleeper.app",
  );
