"use client";

import { useEffect, useId, useState } from "react";

import { MatchupCard } from "@/components/views/matchup-card";
import { leagueMatchups } from "@/lib/league/cache";
import { type PastGame, type Season, seasonTeam, useHistory } from "@/lib/league/history";
import { useLeague } from "@/lib/league/use-league";
import { type Game, startingSlots, weekGames } from "@/lib/league/use-week-games";

import "./league.css";

interface WeekProps {
  season: Season;
  week: number;
  games: PastGame[];
  open: boolean;
  onToggle: (open: boolean) => void;
  myRosterId: number | null;
}

// Lineups come from the week's full rows, which History already cached.
function Week({ season, week, games, open, onToggle, myRosterId }: WeekProps) {
  const [rows, setRows] = useState<Game[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { league } = season;
  const playoffs = week >= league.settings.playoff_week_start;

  useEffect(() => {
    if (!open) return;
    let live = true;
    leagueMatchups(week, false, false, league.league_id).then(
      (r) => live && setRows(weekGames(r, startingSlots(league.roster_positions))),
      (e: Error) => live && setError(e.message),
    );
    return () => {
      live = false;
    };
  }, [open, week, league]);

  const kindOf = (id: number) => games.find((g) => g.id === id)?.kind;
  return (
    <details className="xp-group" open={open} onToggle={(e) => onToggle(e.currentTarget.open)}>
      <summary className="xp-summary-toggle">
        Week {week}
        {playoffs && " (playoffs)"}{" "}
        <span className="font-normal">
          {games.length} {games.length === 1 ? "game" : "games"}
        </span>
      </summary>
      {open && (
        <div className="mt-2 grid grid-cols-1 gap-2" aria-live="polite">
          {error ? (
            <p role="alert">Couldn&rsquo;t load week {week} ({error}).</p>
          ) : !rows ? (
            <p role="status">Loading week {week}...</p>
          ) : (
            rows
              .filter((g) => kindOf(g.id))
              .map((g) => (
                <MatchupCard
                  key={g.id}
                  game={g}
                  leagueId={league.league_id}
                  teamFor={(id) => seasonTeam(season, id)}
                  myRosterId={myRosterId}
                  note={kindOf(g.id) === "consolation" ? "Consolation" : kindOf(g.id) === "playoff" ? "Playoffs" : undefined}
                />
              ))
          )}
        </div>
      )}
    </details>
  );
}

function SeasonWeeks({ season, myRosterId }: { season: Season; myRosterId: number | null }) {
  const weeks = [...new Set(season.games.map((g) => g.week))].sort((a, b) => b - a);
  // The latest finished week starts open, like the old Score History page.
  const [open, setOpen] = useState(() => new Set(weeks.slice(0, 1)));
  if (weeks.length === 0) return <p>No finished games in {season.league.season} yet.</p>;
  return (
    <div className="grid grid-cols-1 gap-2">
      {weeks.map((w) => (
        <Week
          key={w}
          season={season}
          week={w}
          games={season.games.filter((g) => g.week === w)}
          open={open.has(w)}
          onToggle={(o) =>
            setOpen((s) => {
              if (o === s.has(w)) return s;
              const next = new Set(s);
              if (o) next.add(w);
              else next.delete(w);
              return next;
            })
          }
          myRosterId={myRosterId}
        />
      ))}
    </div>
  );
}

export function MatchupHistoryWindow() {
  const history = useHistory();
  const { myRosterId } = useLeague();
  const picker = useId();
  const [pick, setPick] = useState<string | null>(null);

  if (history.status === "error")
    return <p role="alert">Couldn&rsquo;t reach Sleeper ({history.message}). Close the window and open it again to retry.</p>;
  if (history.status !== "ok") return <p role="status">Loading every season...</p>;
  const { seasons } = history;
  if (seasons.length === 0) return <p>No seasons have been played yet.</p>;
  const season = seasons.find((s) => s.league.league_id === pick) ?? seasons[0];

  return (
    <div className="grid grid-cols-1 gap-3">
      <div className="flex items-center gap-2">
        <label htmlFor={picker} className="font-bold">
          Season
        </label>
        <select id={picker} className="xp-select" value={season.league.league_id} onChange={(e) => setPick(e.target.value)}>
          {seasons.map((s) => (
            <option key={s.league.league_id} value={s.league.league_id}>
              {s.league.season}
            </option>
          ))}
        </select>
      </div>
      <SeasonWeeks key={season.league.league_id} season={season} myRosterId={myRosterId} />
    </div>
  );
}
