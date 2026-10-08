export interface SleeperLeague {
  league_id: string;
  name: string;
  season: string;
  status: string;
  total_rosters: number;
  previous_league_id: string | null;
  avatar?: string | null;
  roster_positions: string[];
  scoring_settings: Record<string, number>;
  settings: {
    playoff_week_start: number;
    playoff_teams: number;
    divisions?: number;
    [key: string]: unknown;
  };
  // Division names live here as division_1, division_2, ...
  metadata: Record<string, string> | null;
}

export interface SleeperUser {
  user_id: string;
  display_name: string;
  avatar: string | null;
  // `avatar` here is the league team's own picture, a full URL.
  metadata: { team_name?: string; avatar?: string; [key: string]: unknown } | null;
}

export interface SleeperRoster {
  roster_id: number;
  owner_id: string | null;
  co_owners: string[] | null;
  starters: string[];
  players: string[] | null;
  taxi: string[] | null;
  // Injured reserve.
  reserve?: string[] | null;
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

// One row of /league/<id>/transactions/<week>. `leg` is the week. Failed
// waiver claims come back mixed in with complete ones; `adds`/`drops` map a
// player id to the roster that made the move and are null when empty.
export interface SleeperTransaction {
  transaction_id: string;
  type: "trade" | "waiver" | "free_agent" | "commissioner";
  status: "complete" | "failed" | "pending";
  roster_ids: number[];
  adds: Record<string, number> | null;
  drops: Record<string, number> | null;
  // `owner_id` receives the pick; `roster_id` is its original owner.
  draft_picks: { season: string; round: number; roster_id: number; owner_id: number; previous_owner_id: number }[];
  waiver_budget: { sender: number; receiver: number; amount: number }[];
  // Rolling-waiver leagues send only `seq`; FAAB leagues add `waiver_bid`.
  settings: { waiver_bid?: number; seq?: number } | null;
  status_updated: number;
  leg: number;
}

// /user/<name or id> also carries the account's handle.
export interface SleeperAccount {
  user_id: string;
  username: string;
  display_name: string;
  avatar: string | null;
}

export interface SleeperNflState {
  week: number;
  display_week: number;
  season: string;
  // The season leagues are in, which runs ahead of `season` in the offseason.
  league_season?: string;
  season_type: string;
  leg: number;
}

// api.sleeper.com/players/nfl/<id>: one player, fresher than Xomper's nightly
// list. A defense's id is its team code. Height is inches as a string.
export interface SleeperPlayer {
  player_id: string;
  first_name: string;
  last_name: string;
  position: string | null;
  team: string | null;
  number?: number | null;
  age?: number | null;
  height?: string | null;
  weight?: string | null;
  college?: string | null;
  years_exp?: number | null;
  status?: string | null;
  injury_status?: string | null;
  injury_body_part?: string | null;
  depth_chart_position?: string | null;
  depth_chart_order?: number | null;
}

// One week of api.sleeper.com/stats/nfl/player/<id>. Keys are Sleeper's stat
// names (pass_yd, rec, fgm, ...); a week not yet played, a bye or a game the
// player missed is null.
export interface SleeperWeekStats {
  week: number;
  team: string;
  opponent: string;
  stats: Record<string, number>;
}

// One player's line in the league-wide season stats or a week's projections.
// A player on bye has no projection row, or one with empty stats.
export interface SleeperStatRow {
  player_id: string;
  stats: Record<string, number>;
  player?: { position?: string | null } | null;
}

export interface SleeperGame {
  week: number;
  home: string;
  away: string;
  status: "pre_game" | "in_game" | "complete" | "canceled" | string;
}
