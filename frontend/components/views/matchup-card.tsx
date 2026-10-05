"use client";

import { useId, useState } from "react";

import { TeamName } from "@/components/xp/TeamName";
import { type Player, playerName } from "@/lib/api/players";
import { usePlayers } from "@/lib/league/players";
import type { Team } from "@/lib/league/use-league";
import type { Game, Side } from "@/lib/league/use-week-games";

interface MatchupCardProps {
  game: Game;
  teamFor: (rosterId: number) => Team;
  myRosterId: number | null;
}

// Two teams and their scores; opening it shows both lineups.
export function MatchupCard({ game, teamFor, myRosterId }: MatchupCardProps) {
  const [open, setOpen] = useState(false);
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
              <span className={`xp-score${scored && s.points === top ? " font-bold" : ""}`}>{s.points.toFixed(2)}</span>
            </span>
          );
        })}
        <span className="xp-matchup-hint">{open ? "Hide lineups" : "Show lineups"}</span>
      </button>
      {open && (
        <div id={lineups} className="@container mt-2">
          <div className="grid gap-2 @md:grid-cols-2">
            {game.sides.map((s) => (
              <Lineup key={s.rosterId} side={s} team={teamFor(s.rosterId).name} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function Lineup({ side, team }: { side: Side; team: string }) {
  const players = usePlayers();
  const names = players.status === "ok" ? players.players : {};
  if (side.starters === null || side.bench === null) {
    return (
      <div className="min-w-0">
        <h3 className="font-bold">{team}</h3>
        <p className="xp-note mt-1">Sleeper has no lineup for this team yet.</p>
      </div>
    );
  }
  return (
    <div className="min-w-0">
      <h3 className="font-bold">{team}</h3>
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
      <span className="xp-player-name">{id ? playerName(player, id) : "Empty"}</span>
      {player && <span className="xp-player-team">{player.position === "DEF" ? "DEF" : `${player.position ?? ""} ${player.team ?? "FA"}`}</span>}
      <span className="xp-player-pts">{points.toFixed(2)}</span>
    </li>
  );
}
