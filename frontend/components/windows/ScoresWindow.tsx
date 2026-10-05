"use client";

import { useId, useState } from "react";

import { MatchupCard } from "@/components/views/matchup-card";
import { useDefaultWeek } from "@/lib/league/default-week";
import { useWeekGames } from "@/lib/league/use-week-games";

import "./league.css";

function StepIcon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 16 16" width={12} height={12} aria-hidden focusable="false">
      <path d={d} className="fill-current" />
    </svg>
  );
}

export function ScoresWindow() {
  const [week, setWeek] = useState<number>();
  const [picked, setPicked] = useState(false);
  const picker = useId();
  const { data, games, current, error, teamFor, myRosterId } = useWeekGames(week);
  const initial = useDefaultWeek(data);
  if (!picked && initial !== undefined && week !== initial) setWeek(initial);
  const pick = (w: number) => {
    setPicked(true);
    setWeek(w);
  };

  if (error) return <p role="alert">Couldn&rsquo;t reach Sleeper ({error}). Close Scores and open it again to retry.</p>;
  if (!data || current === undefined || week === undefined) return <p role="status">Loading the league...</p>;

  return (
    <div className="grid gap-3">
      <div className="flex items-stretch gap-2">
        <label htmlFor={picker} className="self-center font-bold">
          Week
        </label>
        <button
          type="button"
          className="xp-button xp-step"
          aria-label="Previous week"
          disabled={week <= 1}
          onClick={() => pick(week - 1)}
        >
          <StepIcon d="M10 3L5 8l5 5z" />
        </button>
        <select id={picker} className="xp-select" value={week} onChange={(e) => pick(Number(e.target.value))}>
          {Array.from({ length: current }, (_, i) => current - i).map((w) => (
            <option key={w} value={w}>
              {w}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="xp-button xp-step"
          aria-label="Next week"
          disabled={week >= current}
          onClick={() => pick(week + 1)}
        >
          <StepIcon d="M6 3l5 5-5 5z" />
        </button>
      </div>
      <div aria-live="polite" className="grid gap-3">
        {!games ? (
          <p role="status">Loading week {week}...</p>
        ) : games.length === 0 ? (
          <p>No matchups for week {week} yet.</p>
        ) : (
          games.map((g) => <MatchupCard key={`${week}-${g.id}`} game={g} teamFor={teamFor} myRosterId={myRosterId} />)
        )}
      </div>
    </div>
  );
}
