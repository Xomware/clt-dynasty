"use client";

import { useId, useState } from "react";

import { CountUp } from "@/components/motion/CountUp";
import { DrillLink } from "@/components/xp/DrillLink";
import { NflTeamLink } from "@/components/xp/NflTeamLink";
import { PlayerFace } from "@/components/xp/PlayerFace";
import { PlayerLink } from "@/components/xp/PlayerLink";
import { TeamName } from "@/components/xp/TeamName";
import { type Player, playerName } from "@/lib/api/players";
import { LEAGUE_ID } from "@/lib/config";
import { usePlayers } from "@/lib/league/players";
import type { Team } from "@/lib/league/use-league";
import type { Game, Side } from "@/lib/league/use-week-games";
import { teamLink } from "@/lib/team/links";

interface MatchupCardProps {
  game: Game;
  // The season the game is from, so a lineup's team opens that season's Team Profile.
  leagueId?: string;
  teamFor: (rosterId: number) => Team;
  myRosterId: number | null;
  // A tag beside the game, like "Consolation".
  note?: string;
  defaultOpen?: boolean;
}

// Two teams and their scores; opening it shows both lineups.
export function MatchupCard({ game, leagueId, teamFor, myRosterId, note, defaultOpen = false }: MatchupCardProps) {
  const [open, setOpen] = useState(defaultOpen);
  const lineups = useId();
  const top = Math.max(...game.sides.map((s) => s.points));
  const scored = top > 0;

  return (
    <section className="xp-group" aria-label={`Matchup ${game.id}`}>
      <button
        type="button"
        className="xp-matchup"
        aria-expanded={open}
        aria-controls={lineups}
        onClick={() => setOpen((o) => !o)}
      >
        {game.sides.map((s) => {
          const team = teamFor(s.rosterId);
          return (
            <span key={s.rosterId} className="xp-matchup-side">
              <TeamName name={team.name} avatarUrl={team.avatarUrl} isMine={s.rosterId === myRosterId} />
              <CountUp value={s.points} decimals={2} className={`xp-score${scored && s.points === top ? " font-bold" : ""}`} />
            </span>
          );
        })}
        <span className="flex items-center justify-between gap-2">
          {note ? <span className="xp-tag">{note}</span> : <span />}
          <span className="xp-matchup-hint">{open ? "Hide lineups" : "Show lineups"}</span>
        </span>
      </button>
      {open && (
        <div id={lineups} className="@container mt-2">
          <div className="grid gap-2 @md:grid-cols-2">
            {game.sides.map((s) => (
              <Lineup key={s.rosterId} side={s} team={teamFor(s.rosterId).name} leagueId={leagueId} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function Lineup({ side, team, leagueId = LEAGUE_ID }: { side: Side; team: string; leagueId?: string }) {
  const heading = (
    <h3 className="font-bold">
      <DrillLink to={teamLink(leagueId, side.rosterId)}>{team}</DrillLink>
    </h3>
  );
  const players = usePlayers();
  const names = players.status === "ok" ? players.players : {};
  if (side.starters === null || side.bench === null) {
    return (
      <div className="min-w-0">
        {heading}
        <p className="xp-note mt-1">Sleeper has no lineup for this team yet.</p>
      </div>
    );
  }
  return (
    <div className="@container min-w-0">
      {heading}
      {players.status === "loading" && <p role="status">Loading player names...</p>}
      {players.status === "error" && <p role="alert">Couldn&rsquo;t load player names, so these are Sleeper ids.</p>}
      <ul aria-label={`${team} starters`} className="mt-1 bg-(--xp-cream)">
        {side.starters.map((s, i) => (
          <PlayerRow key={i} slot={s.slot} id={s.playerId} points={s.points} names={names} />
        ))}
      </ul>
      {side.bench.length > 0 && (
        <details className="mt-1">
          <summary className="xp-summary-toggle">Bench ({side.bench.length})</summary>
          <ul aria-label={`${team} bench`} className="bg-(--xp-cream)">
            {side.bench.map((b) => (
              <PlayerRow key={b.playerId} slot="BN" id={b.playerId} points={b.points} names={names} />
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

interface PlayerRowProps {
  slot: string;
  id: string | null;
  points: number;
  names: Record<string, Player>;
}

function PlayerRow({ slot, id, points, names }: PlayerRowProps) {
  const player = id ? names[id] : undefined;
  return (
    <li className="xp-player-row">
      <span className="xp-player-pos">{slot === "SUPER_FLEX" ? "SF" : slot}</span>
      {id ? (
        <PlayerFace id={id} position={player?.position} className="xp-face-sm" />
      ) : (
        <span className="xp-face xp-face-sm" aria-hidden />
      )}
      <span className="xp-player-name">{id ? <PlayerLink id={id}>{playerName(player, id)}</PlayerLink> : "Empty"}</span>
      {player && (
        <span className="xp-player-team">
          {player.position === "DEF" ? (
            "DEF"
          ) : (
            <>
              {/* The slot says it already, except in a flex. */}
              {player.position !== slot && `${player.position ?? ""} `}
              <NflTeamLink team={player.team} />
            </>
          )}
        </span>
      )}
      <span className="xp-player-pts">{points.toFixed(2)}</span>
    </li>
  );
}
