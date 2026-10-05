"use client";

import { useEffect, useState } from "react";

import { DrillLink } from "@/components/xp/DrillLink";
import { CalendarIcon, WarningIcon } from "@/components/xp/icons";
import { LoadError } from "@/components/xp/LoadError";
import { TeamName } from "@/components/xp/TeamName";
import { announcements as announcementsResource } from "@/lib/announcements";
import { LEAGUE_ID } from "@/lib/config";
import { leagueWeek } from "@/lib/league/default-week";
import { sortStandings } from "@/lib/league/standings";
import type { LeagueData, Team } from "@/lib/league/use-league";
import { useWeekGames } from "@/lib/league/use-week-games";
import { countdown, upcomingDraft } from "@/lib/home/draft";
import { getLeagueDrafts } from "@/lib/sleeper/league";
import { teamLink } from "@/lib/team/links";
import { useLoad } from "@/lib/use-load";

import "./home.css";

export function HomeWindow() {
  // Waits for the league before asking for a week; the live week needs no default-week guess here.
  const [week, setWeek] = useState<number>();
  const { data, games, error, teamFor, myRosterId } = useWeekGames(week);
  const current = data ? leagueWeek(data.league, data.nfl) : undefined;
  if (current !== undefined && week !== current && data?.league.status === "in_season") setWeek(current);

  return (
    <div className="home">
      <Announcements />
      <DraftCountdown />
      <section className="xp-group" aria-labelledby="home-standings">
        <h3 id="home-standings" className="xp-group-title">
          Standings
        </h3>
        {error ? (
          <p role="alert">Couldn&rsquo;t reach Sleeper ({error}). Reopen Home to try again.</p>
        ) : !data ? (
          <p role="status">Loading the league...</p>
        ) : (
          <StandingsScroll data={data} teamFor={teamFor} myRosterId={myRosterId} />
        )}
      </section>
      <section className="xp-group" aria-labelledby="home-week">
        <h3 id="home-week" className="xp-group-title">
          {data?.league.status === "in_season" && week ? `Week ${week} matchups` : "This week"}
        </h3>
        {error ? null : !data ? (
          <p role="status">Loading this week...</p>
        ) : data.league.status !== "in_season" ? (
          <p>This week&rsquo;s matchups show here once games begin.</p>
        ) : !games ? (
          <p role="status">Loading this week&rsquo;s matchups...</p>
        ) : games.length === 0 ? (
          <p>No matchups scheduled for Week {week}.</p>
        ) : (
          <ThisWeek games={games} teamFor={teamFor} myRosterId={myRosterId} />
        )}
      </section>
    </div>
  );
}

function Announcements() {
  const state = announcementsResource.use();
  return (
    <section className="xp-group" aria-labelledby="home-news">
      <h3 id="home-news" className="xp-group-title">
        Announcements
      </h3>
      {state.status === "loading" && <p role="status">Loading announcements...</p>}
      {state.status === "error" && (
        <LoadError what="announcements" message={state.message} onRetry={() => announcementsResource.refresh()} />
      )}
      {state.status === "ok" && state.rows.length === 0 && <p>No announcements from the commissioner right now.</p>}
      {state.status === "ok" && state.rows.length > 0 && (
        <ul className="home-news">
          {state.rows.map((a) => (
            <li key={a.id} className="home-news-item" data-priority={a.priority}>
              <h4 className="home-news-title">
                {a.priority === "critical" && (
                  <>
                    <WarningIcon className="flex-none" />
                    <span className="xp-tag">Important</span>
                  </>
                )}
                {a.title}
              </h4>
              <p className="home-news-body">{a.body}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function useNow(running: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [running]);
  return now;
}

const START = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" });

// No draft waiting is the usual in-season case, so the section stays out of the way then.
function DraftCountdown() {
  const [load, retry] = useLoad(() => getLeagueDrafts(LEAGUE_ID), LEAGUE_ID);
  const draft = load.status === "ok" ? upcomingDraft(load.value) : undefined;
  const start = draft?.start_time ?? null;
  const now = useNow(start !== null && draft?.status === "pre_draft");

  if (load.status === "loading") return null;
  if (load.status === "error") {
    return (
      <section className="xp-group" aria-labelledby="home-draft">
        <h3 id="home-draft" className="xp-group-title">
          Upcoming draft
        </h3>
        <LoadError what="the league's drafts" message={load.message} onRetry={retry} />
      </section>
    );
  }
  if (!draft) return null;

  const live = draft.status !== "pre_draft" || (start !== null && start <= now);
  const clock = live ? (draft.status === "paused" ? "Paused" : "Drafting now") : start !== null ? countdown(start - now) : null;
  return (
    <section className="xp-group home-draft" aria-labelledby="home-draft">
      <h3 id="home-draft" className="xp-group-title">
        Upcoming draft
      </h3>
      <div className="home-draft-body">
        <CalendarIcon width={32} height={32} className="flex-none" />
        <div className="min-w-0">
          <p className="font-bold">{draft.season} Rookie Draft</p>
          {start !== null ? <p className="text-xs">Starts {START.format(start)}</p> : <p className="text-xs">Start time not set yet.</p>}
        </div>
        {/* Not a live region: a per-second announcement would drown everything else. */}
        {clock && <p className="home-countdown">{live ? clock : `Starts in ${clock}`}</p>}
      </div>
    </section>
  );
}

interface LeagueProps {
  teamFor: (rosterId: number) => Team;
  myRosterId: number | null;
}

function StandingsScroll({ data, teamFor, myRosterId }: LeagueProps & { data: LeagueData }) {
  if (data.league.status === "pre_draft" || data.league.status === "drafting") {
    return <p>Standings start once Week 1 kicks off.</p>;
  }
  return (
    <ol className="home-chips" aria-label="Standings by record, then points for">
      {sortStandings(data.rosters).map((s, i) => {
        const team = teamFor(s.rosterId);
        return (
          <li key={s.rosterId} className="home-chip" data-mine={s.rosterId === myRosterId || undefined}>
            <DrillLink to={teamLink(LEAGUE_ID, s.rosterId)} className="home-chip-link">
              <span className="home-chip-rank">{i + 1}</span>
              <TeamName name={team.name} avatarUrl={team.avatarUrl} isMine={s.rosterId === myRosterId} />
              <span className="home-chip-record">
                {s.wins}-{s.losses}
                {s.ties > 0 && `-${s.ties}`}
              </span>
            </DrillLink>
          </li>
        );
      })}
    </ol>
  );
}

interface ThisWeekProps extends LeagueProps {
  games: { id: number; sides: { rosterId: number; points: number }[] }[];
}

function ThisWeek({ games, teamFor, myRosterId }: ThisWeekProps) {
  const mine = (g: ThisWeekProps["games"][number]) => g.sides.some((s) => s.rosterId === myRosterId);
  const sorted = [...games].sort((a, b) => Number(mine(b)) - Number(mine(a)) || a.id - b.id);
  return (
    <>
      <ul className="home-games">
        {sorted.map((g) => (
          <li key={g.id} className="home-game" data-mine={mine(g) || undefined}>
            {g.sides.map((s, i) => {
              const team = teamFor(s.rosterId);
              return (
                <span key={s.rosterId} className="home-game-side" data-side={i === 0 ? "a" : "b"}>
                  <DrillLink to={teamLink(LEAGUE_ID, s.rosterId)}>
                    <TeamName name={team.name} avatarUrl={team.avatarUrl} isMine={s.rosterId === myRosterId} />
                  </DrillLink>
                  <span className="home-game-points">{s.points > 0 ? s.points.toFixed(2) : "-"}</span>
                </span>
              );
            })}
          </li>
        ))}
      </ul>
      <DrillLink to={{ kind: "scores", params: {} }} className="home-more">
        All scores and lineups
      </DrillLink>
    </>
  );
}
