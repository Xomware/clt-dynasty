"use client";

import { useEffect, useMemo, useState } from "react";

import { TeamName } from "@/components/xp/TeamName";
import { type Bracket, finishOrder, fromSleeper, lastFinishedWeek, type Match, type Slot } from "@/lib/league/brackets";
import { leagueMatchups, winnersBracket } from "@/lib/league/cache";
import { playoffSeeds, sortStandings } from "@/lib/league/standings";
import { type Team, useLeague } from "@/lib/league/use-league";
import type { SleeperBracketMatch, SleeperMatchup } from "@/lib/sleeper/types";

import "./league.css";

interface Playoffs {
  bracket: SleeperBracketMatch[];
  // Rows for each playoff week that has started, in order.
  weeks: SleeperMatchup[][];
}

const roundName = (i: number, count: number) =>
  i === count - 1 ? "Final" : i === count - 2 ? "Semifinals" : `Round ${i + 1}`;

const PLACES = ["Champion", "Runner-up", "3rd", "4th", "5th", "6th"];

interface SlotRowProps {
  slot: Slot;
  out: boolean;
  points: number | undefined;
  teamFor: (rosterId: number) => Team;
  myRosterId: number | null;
}

function SlotRow({ slot, out, points, teamFor, myRosterId }: SlotRowProps) {
  const team = slot.rosterId === null ? null : teamFor(slot.rosterId);
  return (
    <li className={`xp-slot${out ? " xp-slot-out" : ""}`}>
      <span className="xp-seed">{slot.seed ?? ""}</span>
      {team ? (
        <TeamName name={team.name} avatarUrl={team.avatarUrl} isMine={slot.rosterId === myRosterId} />
      ) : (
        <span className="min-w-0">TBD {slot.from && <span className="xp-slot-from">({slot.from})</span>}</span>
      )}
      {out && <span className="sr-only">(out)</span>}
      {points !== undefined && <span className="xp-score ml-auto">{points.toFixed(2)}</span>}
    </li>
  );
}

interface BracketViewProps {
  bracket: Bracket;
  startWeek: number;
  weeks: SleeperMatchup[][];
  teamFor: (rosterId: number) => Team;
  myRosterId: number | null;
}

function BracketView({ bracket, startWeek, weeks, teamFor, myRosterId }: BracketViewProps) {
  const count = bracket.rounds.length;
  const row = (m: Match, s: Slot, i: number) => (
    <SlotRow
      slot={s}
      out={s.rosterId !== null && m.loser === s.rosterId}
      points={weeks[i]?.find((r) => r.roster_id === s.rosterId)?.points}
      teamFor={teamFor}
      myRosterId={myRosterId}
    />
  );
  return (
    <div className="@container">
      <div className="grid gap-3 @xl:grid-cols-3">
        {bracket.rounds.map((matches, i) => (
          <section key={i} className="min-w-0" aria-label={roundName(i, count)}>
            <h3 className="xp-round-title">
              {roundName(i, count)} <span className="font-normal">Week {startWeek + i}</span>
            </h3>
            <ol className="flex flex-col gap-2">
              {matches.map((m) => (
                <li key={m.id} className="xp-bracket-match">
                  <span className="xp-slot-from">Game {m.id}</span>
                  <ul>
                    {row(m, m.a, i)}
                    {row(m, m.b, i)}
                  </ul>
                </li>
              ))}
            </ol>
            {i === 0 && bracket.byes.length > 0 && (
              <ul className="xp-bracket-match mt-2" aria-label="Round 1 byes">
                {bracket.byes.map((s) => (
                  <li key={s.rosterId} className="xp-slot">
                    <span className="xp-seed">{s.seed}</span>
                    {s.rosterId !== null && (
                      <TeamName
                        name={teamFor(s.rosterId).name}
                        avatarUrl={teamFor(s.rosterId).avatarUrl}
                        isMine={s.rosterId === myRosterId}
                      />
                    )}
                    <span className="xp-tag ml-auto">Bye</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}

export function PlayoffsWindow() {
  const { data, error: leagueError, teamFor, myRosterId } = useLeague();
  const [playoffs, setPlayoffs] = useState<Playoffs | null>(null);
  const [error, setError] = useState<string | null>(null);

  const start = data?.league.settings.playoff_week_start ?? 15;
  const finished = data ? lastFinishedWeek(data.nfl, data.league.season) : 0;
  const inSeason = data?.league.status === "in_season";
  const current = data?.league.status === "complete" ? Infinity : (data?.nfl.week ?? 0);

  useEffect(() => {
    if (!data) return;
    let live = true;
    const weeks = [start, start + 1, start + 2].filter((w) => w <= current);
    Promise.all([winnersBracket(inSeason), Promise.all(weeks.map((w) => leagueMatchups(w, w > finished)))])
      .then(([bracket, rows]) => live && setPlayoffs({ bracket, weeks: rows }))
      .catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [data, start, current, finished, inSeason]);

  const view = useMemo(() => {
    if (!data || !playoffs) return null;
    const seeds = playoffSeeds(sortStandings(data.rosters));
    const bracket = fromSleeper(playoffs.bracket, seeds);
    return { bracket, finish: finishOrder(bracket, seeds) };
  }, [data, playoffs]);

  const failed = leagueError ?? error;
  if (failed) return <p role="alert">Couldn&rsquo;t reach Sleeper ({failed}). Close Playoffs and open it again to retry.</p>;
  if (!data || !playoffs || !view) return <p role="status">Loading the bracket...</p>;
  if (view.bracket.rounds.length === 0) return <p>Sleeper hasn&rsquo;t drawn the {data.league.season} bracket yet.</p>;

  const projected = inSeason && finished < start - 1;
  return (
    <div className="grid grid-cols-1 gap-3">
      {projected && (
        <p className="flex flex-wrap items-center gap-2">
          <span className="xp-tag">Projected</span>
          Seeded from today&rsquo;s standings. The bracket locks once week {start - 1} ends.
        </p>
      )}
      <BracketView
        bracket={view.bracket}
        startWeek={start}
        weeks={playoffs.weeks}
        teamFor={teamFor}
        myRosterId={myRosterId}
      />
      {view.finish && (
        <section className="xp-group" aria-labelledby="playoffs-finish">
          <h3 id="playoffs-finish" className="xp-group-title">
            Final standings
          </h3>
          <ol className="flex flex-col gap-1">
            {view.finish.map((id, i) => (
              <li key={id} className="flex items-center gap-2">
                <span className="w-20 flex-none font-bold">{PLACES[i] ?? `${i + 1}th`}</span>
                <TeamName name={teamFor(id).name} avatarUrl={teamFor(id).avatarUrl} isMine={id === myRosterId} />
              </li>
            ))}
          </ol>
          <p className="mt-2 text-xs">No consolation games: knocked-out teams rank by seed within their round.</p>
        </section>
      )}
    </div>
  );
}
