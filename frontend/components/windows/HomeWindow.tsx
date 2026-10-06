"use client";

import { useState } from "react";

import { HomeCard } from "@/components/home/HomeCard";
import { LeaguePulse } from "@/components/home/LeaguePulse";
import { MovesCard } from "@/components/home/MovesCard";
import { MyTeamCard } from "@/components/home/MyTeamCard";
import { ProposalsCard } from "@/components/home/ProposalsCard";
import { QuickActions } from "@/components/home/QuickActions";
import { TaxiCard } from "@/components/home/TaxiCard";
import { WorldCupCard } from "@/components/home/WorldCupCard";
import { AIHeadline } from "@/components/windows/AIReviewWindow";
import { DrillLink } from "@/components/xp/DrillLink";
import { WarningIcon } from "@/components/xp/icons";
import { LoadError } from "@/components/xp/LoadError";
import { CountUp } from "@/components/motion/CountUp";
import { TeamName } from "@/components/xp/TeamName";
import { announcements as announcementsResource } from "@/lib/announcements";
import { LEAGUE_ID } from "@/lib/config";
import { leagueWeek } from "@/lib/league/default-week";
import { sortStandings } from "@/lib/league/standings";
import type { LeagueData, Team } from "@/lib/league/use-league";
import { type Game, useWeekGames } from "@/lib/league/use-week-games";
import { useMember } from "@/lib/member/use-member";
import { teamLink } from "@/lib/team/links";

import "./home.css";

export function HomeWindow() {
  // Waits for the league before asking for a week; the live week needs no default-week guess here.
  const [week, setWeek] = useState<number>();
  const { data, games, error, teamFor, myRosterId } = useWeekGames(week);
  const member = useMember().state;
  const current = data ? leagueWeek(data.league, data.nfl) : undefined;
  if (current !== undefined && week !== current && data?.league.status === "in_season") setWeek(current);
  const inSeason = data?.league.status === "in_season";
  const live = inSeason && week !== undefined && week >= (data?.nfl.week ?? 0);
  // Sleeper files offseason moves under leg 1.
  const movesWeek = data ? (week ?? Math.max(1, data.nfl.leg)) : undefined;
  const league = { teamFor, myRosterId };

  return (
    <div className="home">
      <LeaguePulse data={data} week={week} error={error} />
      <QuickActions />
      <Announcements />
      <MyTeamCard data={data} games={games} week={week} live={live} memberLoading={member.status === "loading"} {...league} />
      <div className="home-cols">
        <div className="home-col">
          <HomeCard
            title={inSeason && week ? `Week ${week} matchups` : "This week"}
            more={{ to: { kind: "scores", params: {} }, label: "Scores" }}
          >
            {error ? (
              <p role="alert">Couldn&rsquo;t reach Sleeper ({error}). Reopen Home to try again.</p>
            ) : !data ? (
              <p role="status">Loading this week...</p>
            ) : !inSeason ? (
              <p>This week&rsquo;s matchups show here once games begin.</p>
            ) : !games ? (
              <p role="status">Loading this week&rsquo;s matchups...</p>
            ) : games.length === 0 ? (
              <p>No matchups scheduled for Week {week}.</p>
            ) : (
              <ThisWeek games={games} live={live} {...league} />
            )}
          </HomeCard>
          <HomeCard title="Standings" more={{ to: { kind: "standings", params: {} }, label: "Standings" }}>
            {error ? null : !data ? <p role="status">Loading the league...</p> : <StandingsList data={data} {...league} />}
          </HomeCard>
        </div>
        <div className="home-col">
          <AIHeadline />
          <WorldCupCard data={data} {...league} />
          <ProposalsCard />
          <TaxiCard {...league} />
          <MovesCard week={movesWeek} live={live} {...league} />
        </div>
      </div>
    </div>
  );
}

export function Announcements() {
  const state = announcementsResource.use();
  return (
    <HomeCard title="Announcements">
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
    </HomeCard>
  );
}

export interface LeagueProps {
  teamFor: (rosterId: number) => Team;
  myRosterId: number | null;
}

function StandingsList({ data, teamFor, myRosterId }: LeagueProps & { data: LeagueData }) {
  if (data.league.status === "pre_draft" || data.league.status === "drafting") {
    return <p>Standings start once Week 1 kicks off.</p>;
  }
  return (
    <ol className="home-rows" aria-label="Standings by record, then points for">
      {sortStandings(data.rosters).map((s, i) => {
        const team = teamFor(s.rosterId);
        return (
          <li key={s.rosterId} className="home-row" data-mine={s.rosterId === myRosterId || undefined}>
            <span className="home-row-rank">{i + 1}</span>
            <DrillLink to={teamLink(LEAGUE_ID, s.rosterId)} className="min-w-0">
              <TeamName name={team.name} avatarUrl={team.avatarUrl} isMine={s.rosterId === myRosterId} />
            </DrillLink>
            <span className="home-row-stat">
              {s.wins}-{s.losses}
              {s.ties > 0 && `-${s.ties}`}
            </span>
            <span className="home-row-stat home-row-pf">{s.pf.toFixed(2)}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function ThisWeek({ games, live, teamFor, myRosterId }: LeagueProps & { games: Game[]; live: boolean }) {
  const mine = (g: Game) => g.sides.some((s) => s.rosterId === myRosterId);
  const sorted = [...games].sort((a, b) => Number(mine(b)) - Number(mine(a)) || a.id - b.id);
  return (
    <>
      {live && games.some((g) => g.sides.some((s) => s.points > 0)) && (
        <p className="home-live-note">
          <span className="xp-tag home-live">Live</span> Scores refresh every minute.
        </p>
      )}
      <ul className="home-games">
        {sorted.map((g) => (
          <li key={g.id} className="home-game" data-mine={mine(g) || undefined}>
            {g.sides.map((s, i) => {
              const team = teamFor(s.rosterId);
              const other = g.sides[1 - i];
              return (
                <span
                  key={s.rosterId}
                  className="home-game-side"
                  data-side={i === 0 ? "a" : "b"}
                  data-ahead={(other && s.points > other.points) || undefined}
                >
                  <DrillLink to={teamLink(LEAGUE_ID, s.rosterId)}>
                    <TeamName name={team.name} avatarUrl={team.avatarUrl} isMine={s.rosterId === myRosterId} />
                  </DrillLink>
                  <CountUp value={s.points} decimals={2} empty="-" className="home-game-points" />
                </span>
              );
            })}
          </li>
        ))}
      </ul>
    </>
  );
}
