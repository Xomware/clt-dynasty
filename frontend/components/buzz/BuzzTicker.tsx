"use client";

import { type CSSProperties, useContext, useState } from "react";

import { DrillContext } from "@/lib/desktop/navigation";
import { leagueWeek } from "@/lib/league/default-week";
import type { Team } from "@/lib/league/use-league";
import { type Game, useWeekGames } from "@/lib/league/use-week-games";
import { Led } from "./Led";

const pts = (n: number) => n.toFixed(1);

// Board text is short: a team name trimmed to fit the LED segment.
const short = (name: string) => (name.length > 22 ? `${name.slice(0, 21).trimEnd()}...` : name);

interface LedGameProps {
  game: Game;
  teamFor: (rosterId: number) => Team;
  mine: boolean;
  onOpen: () => void;
  copy?: boolean;
}

function LedGame({ game, teamFor, mine, onOpen, copy = false }: LedGameProps) {
  const [a, b] = game.sides;
  if (!a || !b) return null;
  const ahead = a.points === b.points ? null : a.points > b.points ? a.rosterId : b.rosterId;
  const side = (s: typeof a) => (
    <span className="bz-led-side" data-ahead={ahead === s.rosterId || undefined}>
      <span className="bz-led-name">{short(teamFor(s.rosterId).name)}</span>
      <span className="bz-led-pts">
        <Led text={pts(s.points)} />
      </span>
    </span>
  );
  return (
    <li>
      <button type="button" className="bz-led-game" data-me={mine || undefined} tabIndex={copy ? -1 : undefined} onClick={onOpen}>
        {side(a)}
        <span className="bz-led-vs" aria-hidden>
          /
        </span>
        {side(b)}
      </button>
    </li>
  );
}

// The arena's LED ribbon board: this week's games scrolling across the top.
// Pauses under the pointer or focus; reduced motion makes it a scrolling row.
export function BuzzTicker() {
  const [week, setWeek] = useState<number>();
  const { data, games, teamFor, myRosterId } = useWeekGames(week);
  const open = useContext(DrillContext);
  const current = data ? leagueWeek(data.league, data.nfl) : undefined;
  if (current !== undefined && week !== current) setWeek(current);
  if (data && data.league.status !== "in_season") return null;

  const live = data !== null && week !== undefined && week >= data.nfl.week && (games ?? []).some((g) => g.sides.some((s) => s.points > 0));
  const isMine = (g: Game) => g.sides.some((s) => s.rosterId === myRosterId);
  const sorted = [...(games ?? [])].sort((x, y) => Number(isMine(y)) - Number(isMine(x)) || x.id - y.id);
  const toScores = () => open({ kind: "scores", params: {} });

  return (
    <section className="bz-led" aria-label={week ? `Week ${week} scores` : "This week's scores"} data-live={live || undefined}>
      <p className="bz-led-label">
        {live ? (
          <>
            <span className="bz-live-dot" aria-hidden /> Live
          </>
        ) : week ? (
          `Wk ${week}`
        ) : (
          "Wk"
        )}
      </p>
      {sorted.length === 0 ? (
        <p className="bz-led-wait" role="status">
          {games ? "No games this week" : "Warming up the board"}
        </p>
      ) : (
        <div className="bz-led-track" style={{ "--n": sorted.length } as CSSProperties}>
          <div className="bz-led-run">
            <ul className="bz-led-list">
              {sorted.map((g) => (
                <LedGame key={g.id} game={g} teamFor={teamFor} mine={isMine(g)} onOpen={toScores} />
              ))}
            </ul>
            <ul className="bz-led-list" aria-hidden>
              {sorted.map((g) => (
                <LedGame key={g.id} game={g} teamFor={teamFor} mine={isMine(g)} onOpen={toScores} copy />
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}
