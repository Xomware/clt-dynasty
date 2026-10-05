export interface SleeperLeague {
  league_id: string;
  name: string;
  season: string;
  status: string;
  total_rosters: number;
  previous_league_id: string | null;
  roster_positions: string[];
  scoring_settings: Record<string, number>;
  settings: {
    playoff_week_start: number;
    playoff_teams: number;
    [key: string]: unknown;
  };
  // Division names live here as division_1, division_2, ...
  metadata: Record<string, string> | null;
}

export interface SleeperUser {
  user_id: string;
  display_name: string;
  avatar: string | null;
  metadata: { team_name?: string; [key: string]: unknown } | null;
}

export interface SleeperRoster {
  roster_id: number;
  owner_id: string | null;
  co_owners: string[] | null;
  starters: string[];
  players: string[] | null;
  taxi: string[] | null;
  settings: {
    wins: number;
    losses: number;
    ties: number;
    fpts: number;
    fpts_decimal?: number;
    fpts_against?: number;
    fpts_against_decimal?: number;
    division?: number;
    [key: string]: unknown;
  };
  // `streak` reads like "3W" or "2L".
  metadata: { streak?: string; [key: string]: unknown } | null;
}

export interface SleeperMatchup {
  roster_id: number;
  // null for a team with no game that week, as in the playoffs.
  matchup_id: number | null;
  points: number;
  // null when Sleeper has no lineup data for the roster yet; an actual empty slot is "0".
  starters: string[] | null;
  starters_points: number[];
  players: string[] | null;
  players_points: Record<string, number> | null;
}

// `t1`/`t2` are roster ids once known; before that the `_from` fields say
// which earlier match feeds the slot. `p` marks a placement game: 1 is the final.
export interface SleeperBracketMatch {
  r: number;
  m: number;
  t1: number | null;
  t2: number | null;
  w: number | null;
  l: number | null;
  t1_from?: { w?: number; l?: number };
  t2_from?: { w?: number; l?: number };
  p?: number;
}

export interface SleeperDraft {
  draft_id: string;
  league_id: string;
  season: string;
  status: "pre_draft" | "drafting" | "paused" | "complete";
  type: "linear" | "snake" | "auction";
  // ms since epoch; null until the commissioner schedules it.
  start_time: number | null;
  settings: { rounds: number; teams: number; [key: string]: unknown };
  // user_id -> draft slot; null until the order is set.
  draft_order: Record<string, number> | null;
  metadata: { name?: string } | null;
}

// `roster_id` is the roster that made the pick, after any trade.
export interface SleeperDraftPick {
  round: number;
  pick_no: number;
  draft_slot: number;
  player_id: string;
  picked_by: string;
  roster_id: number;
  is_keeper: boolean | null;
  metadata: { first_name?: string; last_name?: string; position?: string; team?: string };
}

// `roster_id` is the pick's original owner; `owner_id` holds it now.
export interface SleeperTradedPick {
  season: string;
  round: number;
  roster_id: number;
  previous_owner_id: number;
  owner_id: number;
}

export interface SleeperNflState {
  week: number;
  display_week: number;
  season: string;
  season_type: string;
  leg: number;
}
