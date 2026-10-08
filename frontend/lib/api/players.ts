import { request } from "./client";

// GET /players/list (xomper-back-end api_players_list): Sleeper's player map,
// slimmed to fantasy positions. A defense's id is its team code.
// The ingest skips empty values, so any field but the id can be missing: a
// free agent has no `team`.
export interface Player {
  player_id: string;
  first_name?: string;
  last_name?: string;
  position?: string;
  team?: string;
  injury_status?: string;
  injury_body_part?: string;
  // "Active", "Inactive", "Injured Reserve", "Non Football Injury", ...
  status?: string;
  age?: number;
  years_exp?: number;
  number?: number;
  // Sleeper's rank within the position across every team's chart: 1 is the starter.
  depth_chart_order?: number;
  // The chart's slot: LWR, RWR, SWR for receivers; missing on rows ingested before it was added.
  depth_chart_position?: string;
  // Lower is more relevant; free agents and practice squads sit near 9999999.
  search_rank?: number;
}

export const getPlayers = () => request<{ players: Record<string, Player> }>("/players/list").then((r) => r.players);

export const playerName = (p: Player | undefined, id: string) => (p ? [p.first_name, p.last_name].filter(Boolean).join(" ") || id : id);
