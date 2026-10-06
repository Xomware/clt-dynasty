"use client";

import { type CSSProperties, useContext, useState } from "react";

import { TeamAvatar } from "@/components/xp/TeamAvatar";
import { DrillContext } from "@/lib/desktop/navigation";
import { leagueWeek } from "@/lib/league/default-week";
import type { Team } from "@/lib/league/use-league";
import { type Game, useWeekGames } from "@/lib/league/use-week-games";

const pts = (n: number) => (n > 0 ? n.toFixed(1) : "-");

interface TickerGameProps {
  game: Game;
  teamFor: (rosterId: number) => Team;
  mine: boolean;
  onOpen: () => void;
  // The second, looping copy is decoration: out of the tab order and the a11y tree.
  copy?: boolean;
}

function TickerGame({ game, teamFor, mine, onOpen, copy = false }: TickerGameProps) {
  const [a, b] = game.sides;
  if (!a || !b) return null;
  const ahead = a.points === b.points ? null : a.points > b.points ? a.rosterId : b.rosterId;
  const side = (s: typeof a) => {
    const team = teamFor(s.rosterId);
    return (
      <span className="u-tick-side" data-ahead={ahead === s.rosterId || undefined}>
        <TeamAvatar name={team.name} url={team.avatarUrl} size={20} className="u-tick-avatar" />
        <span className="u-tick-name">{team.name}</span>
        <span className="u-tick-pts">{pts(s.points)}</span>
      </span>
    );
  };
  return (
    <li>
      <button type="button" className="u-tick" data-mine={mine || undefined} tabIndex={copy ? -1 : undefined} onClick={onOpen}>
        {side(a)}
        <span className="u-tick-vs" aria-hidden>
          vs
        </span>
        {side(b)}
      </button>
    </li>
  );
}

// This week's matchups, looping across the top of every page. Pauses under the
// pointer or keyboard focus; with reduced motion it is a plain scrolling row.
export function ScoreTicker() {
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
    <section className="u-ticker" aria-label={week ? `Week ${week} scores` : "This week's scores"} data-live={live || undefined}>
      <p className="u-ticker-label">
        {live && <span className="u-live-dot" aria-hidden />}
        {live ? "Live" : week ? `Week ${week}` : "This week"}
      </p>
      {sorted.length === 0 ? (
        <p className="u-ticker-wait" role="status">
          {games ? (
            "No matchups this week."
          ) : (
            <>
              <span className="u-shimmer-line" aria-hidden />
              <span className="sr-only">Loading this week&rsquo;s matchups</span>
            </>
          )}
        </p>
      ) : (
        <div className="u-ticker-track" style={{ "--n": sorted.length } as CSSProperties}>
          <div className="u-ticker-run">
            <ul className="u-ticker-list">
              {sorted.map((g) => (
                <TickerGame key={g.id} game={g} teamFor={teamFor} mine={isMine(g)} onOpen={toScores} />
              ))}
            </ul>
            <ul className="u-ticker-list u-ticker-copy" aria-hidden>
              {sorted.map((g) => (
                <TickerGame key={g.id} game={g} teamFor={teamFor} mine={isMine(g)} onOpen={toScores} copy />
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}
