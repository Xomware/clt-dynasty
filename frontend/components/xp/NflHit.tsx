import Image from "next/image";

import { type Player, playerName } from "@/lib/api/players";
import type { Team } from "@/lib/league/use-league";
import { designation } from "@/lib/nfl/injury";
import { type NflTeam, nflLogo, nflTeam } from "@/lib/nfl/teams";
import { InjuryBadge } from "./InjuryBadge";
import { PlayerFace } from "./PlayerFace";

import "./nfl-hit.css";

interface PlayerHitProps {
  player: Player;
  owner: Team | null;
}

// A search result row's insides: face, name, then position, NFL team, injury and CLT owner.
export function PlayerHit({ player, owner }: PlayerHitProps) {
  const team = nflTeam(player.team);
  const d = designation(player);
  return (
    <>
      <PlayerFace id={player.player_id} position={player.position} size={40} className="nfl-hit-face" />
      <span className="nfl-hit-text">
        <span className="nfl-hit-name">{playerName(player, player.player_id)}</span>
        <span className="nfl-hit-meta">
          {player.position && <span className="nfl-hit-pos">{player.position}</span>}
          {team ? (
            <span className="nfl-hit-team">
              <Image src={nflLogo(team.abbr)} alt="" width={16} height={16} unoptimized className="nfl-hit-logo" />
              {team.abbr}
            </span>
          ) : (
            <span>FA</span>
          )}
          {d && <InjuryBadge designation={d} bodyPart={player.injury_body_part} />}
        </span>
      </span>
      {owner && <span className="nfl-hit-owner">{owner.name}</span>}
    </>
  );
}

export function NflTeamHit({ team }: { team: NflTeam }) {
  return (
    <>
      <span className="nfl-hit-face" data-logo aria-hidden>
        <Image src={nflLogo(team.abbr)} alt="" width={40} height={40} unoptimized />
      </span>
      <span className="nfl-hit-text">
        <span className="nfl-hit-name">
          {team.city} {team.name}
        </span>
        <span className="nfl-hit-meta">
          <span className="nfl-hit-pos">{team.abbr}</span>
          <span>{team.division}</span>
        </span>
      </span>
    </>
  );
}
