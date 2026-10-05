import { request } from "@/lib/api/client";
import { sharedResource } from "@/lib/shared-resource";

// One row of Xomper's GET /players/list (xomper-back-end api_players_list),
// slimmed from Sleeper's /players/nfl. The ingest skips empty values, so
// any field but the id can be missing: a free agent has no `team`.
export interface Player {
  player_id: string;
  first_name?: string;
  last_name?: string;
  full_name?: string;
  position?: string;
  team?: string;
  status?: string;
  injury_status?: string;
  age?: number;
  years_exp?: number;
  number?: number;
  fantasy_positions?: string[];
  height?: string;
  weight?: string;
  college?: string;
  search_full_name?: string;
  search_rank?: number;
}

export type PlayerMap = Record<string, Player>;

interface PlayersResponse {
  count: number;
  players: PlayerMap;
}

// About 4,300 players instead of Sleeper's 14.6 MB dump, once per session.
export const players = sharedResource(async () => {
  const { players } = await request<PlayersResponse>("/players/list");
  return { status: "ok" as const, players };
});

// Team defenses have no full_name in Sleeper; their first and last name are city and nickname.
export function playerName(player: Player | undefined, id: string): string {
  if (!player) return `Player ${id}`;
  return player.full_name || [player.first_name, player.last_name].filter(Boolean).join(" ") || `Player ${id}`;
}
