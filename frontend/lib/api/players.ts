import { request } from "./client";

// GET /players/list (xomper-back-end api_players_list): Sleeper's player map,
// slimmed to fantasy positions. A defense's id is its team code.
export interface Player {
  player_id: string;
  first_name?: string;
  last_name?: string;
  position?: string;
  team?: string;
}

export const getPlayers = () =>
  request<{ players: Record<string, Player> }>("/players/list").then((r) => r.players);

export const playerName = (p: Player | undefined, id: string) =>
  p ? [p.first_name, p.last_name].filter(Boolean).join(" ") || id : id;
