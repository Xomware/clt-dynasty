"use client";

import { useMemo } from "react";

import { type Player, playerName } from "@/lib/api/players";
import { usePlayers } from "@/lib/league/players";
import { type Team, useLeague } from "@/lib/league/use-league";
import { designation, designationText } from "@/lib/nfl/injury";
import { type NflTeam, nflTeam, nflTeamName } from "@/lib/nfl/teams";
import { type Hit, searchNflTeams, searchPlayers } from "./nfl";

export interface PlayerResult extends Hit<Player> {
  // The CLT team that rosters him, if any.
  owner: Team | null;
  // Everything the row shows, for the option's accessible name.
  description: string;
}

export function playerDescription(p: Player, owner: Team | null) {
  const team = nflTeam(p.team);
  const d = designation(p);
  return [
    playerName(p, p.player_id),
    p.position,
    team ? nflTeamName(team) : "Free agent",
    d && designationText(d, p.injury_body_part),
    owner && `on ${owner.name}`,
  ]
    .filter(Boolean)
    .join(", ");
}

// NFL players and teams matching `query`, with each player's CLT owner. The
// players list loads on first use and is shared with every other window.
export function useNflSearch(query: string, limit: number) {
  const players = usePlayers();
  const { data, teamFor } = useLeague();
  const owners = useMemo(() => new Map((data?.rosters ?? []).flatMap((r) => (r.players ?? []).map((id) => [id, r.roster_id] as const))), [data]);
  const map = players.status === "ok" ? players.players : null;
  const found = useMemo((): PlayerResult[] => {
    if (!map) return [];
    return searchPlayers(map, query, limit).map((h) => {
      const rosterId = owners.get(h.item.player_id);
      const owner = rosterId === undefined ? null : teamFor(rosterId);
      return { ...h, owner, description: playerDescription(h.item, owner) };
    });
  }, [map, query, limit, owners, teamFor]);
  const teams: Hit<NflTeam>[] = useMemo(() => searchNflTeams(query), [query]);
  return { players: found, teams, status: players.status };
}
