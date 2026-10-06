"use client";

import { type CSSProperties, type Ref } from "react";

import { QuickActions } from "@/components/home/QuickActions";
import { CountUp } from "@/components/motion/CountUp";
import { DrillLink } from "@/components/xp/DrillLink";
import { TeamAvatar } from "@/components/xp/TeamAvatar";
import { LEAGUE_ID } from "@/lib/config";
import { leagueWeek, weekOf } from "@/lib/league/default-week";
import { divisionName, playoffSeeds, sortStandings } from "@/lib/league/standings";
import type { LeagueData, Team } from "@/lib/league/use-league";
import type { Game } from "@/lib/league/use-week-games";
import { teamLink } from "@/lib/team/links";
import { ordinal } from "@/lib/team/team";

function kicker(data: LeagueData | null): string {
  if (!data) return "Charlotte, NC";
  const { league } = data;
  if (league.status !== "in_season") return `${league.season} season`;
  const week = leagueWeek(league, data.nfl);
  return `Week ${week} of ${weekOf(league, week)} · ${league.season}`;
}

interface HomeHeroProps {
  data: LeagueData | null;
  games: Game[] | null;
  week: number | undefined;
  live: boolean;
  teamFor: (rosterId: number) => Team;
  myRosterId: number | null;
  memberLoading: boolean;
  headingRef?: Ref<HTMLHeadingElement>;
  // The phone's bar holds the page's h1, so the hero title steps down to an h2.
  phone: boolean;
}

// Home's opening: the league's title and quick actions beside the member's
// own team, with this week's game as a live score bar.
export function HomeHero({ data, games, week, live, teamFor, myRosterId, memberLoading, headingRef, phone }: HomeHeroProps) {
  const Title = phone ? "h2" : "h1";
  return (
    <section aria-label="This week" className="u-hero">
      <div className="u-hero-copy">
        <p className="u-hero-kicker">{kicker(data)}</p>
        <Title ref={headingRef} tabIndex={-1} className="u-hero-title">
          The Queen City&rsquo;s <span>dynasty league</span>
        </Title>
        <QuickActions className="u-actions" />
      </div>
      <div className="u-mine">
        {!data || memberLoading ? (
          <MineSkeleton />
        ) : myRosterId === null ? (
          <div className="u-mine-unlinked">
            <p className="u-mine-label">Your team</p>
            <p>Your Sleeper account isn&rsquo;t linked to a CLT roster yet.</p>
            <DrillLink to={{ kind: "settings", params: {} }} className="u-mine-link">
              Link it in Settings
            </DrillLink>
          </div>
        ) : (
          <Mine data={data} games={games} week={week} live={live} teamFor={teamFor} rosterId={myRosterId} />
        )}
      </div>
    </section>
  );
}

function MineSkeleton() {
  return (
    <div className="u-mine-skeleton" role="status">
      <span className="u-skel u-skel-avatar" aria-hidden />
      <span className="u-skel u-skel-line" aria-hidden />
      <span className="u-skel u-skel-line u-skel-short" aria-hidden />
      <span className="sr-only">Loading your team...</span>
    </div>
  );
}

interface MineProps {
  data: LeagueData;
  games: Game[] | null;
  week: number | undefined;
  live: boolean;
  teamFor: (rosterId: number) => Team;
  rosterId: number;
}

function Mine({ data, games, week, live, teamFor, rosterId }: MineProps) {
  const standings = sortStandings(data.rosters);
  const at = standings.findIndex((s) => s.rosterId === rosterId);
  const me = standings[at];
  const seed = playoffSeeds(standings).indexOf(rosterId) + 1;
  const team = teamFor(rosterId);
  const started = data.league.status === "in_season" || data.league.status === "complete";
  const inPlayoffs = seed > 0 && seed <= data.league.settings.playoff_teams;
  const game = games?.find((g) => g.sides.some((s) => s.rosterId === rosterId));

  return (
    <>
      <div className="u-mine-head">
        <TeamAvatar name={team.name} url={team.avatarUrl} size={96} className="u-mine-avatar" />
        <div className="min-w-0">
          <p className="u-mine-label">Your team</p>
          <DrillLink to={teamLink(LEAGUE_ID, rosterId)} className="u-mine-name">
            {team.name}
          </DrillLink>
          {me && started && (
            <p className="u-mine-sub">
              {divisionName(data.league, me.division)} · {inPlayoffs ? `Seed ${seed} today` : "Outside the seeds"}
            </p>
          )}
        </div>
      </div>
      {me && started && (
        <dl className="u-mine-stats">
          <div>
            <dt>Record</dt>
            <dd>
              {me.wins}-{me.losses}
              {me.ties > 0 && `-${me.ties}`}
            </dd>
          </div>
          <div>
            <dt>Rank</dt>
            <dd>
              {ordinal(at + 1)}
              <small> of {standings.length}</small>
            </dd>
          </div>
          <div>
            <dt>Points for</dt>
            <dd>
              <CountUp value={me.pf} decimals={1} />
            </dd>
          </div>
          <div>
            <dt>Streak</dt>
            <dd data-streak={me.streak.at(-1)}>{me.streak || "-"}</dd>
          </div>
        </dl>
      )}
      {week !== undefined && game && <ScoreBar game={game} week={week} live={live} teamFor={teamFor} rosterId={rosterId} />}
    </>
  );
}

interface ScoreBarProps {
  game: Game;
  week: number;
  live: boolean;
  teamFor: (rosterId: number) => Team;
  rosterId: number;
}

// This week's game as a tug of war: the bar splits by share of the points.
function ScoreBar({ game, week, live, teamFor, rosterId }: ScoreBarProps) {
  const mine = game.sides.find((s) => s.rosterId === rosterId);
  const them = game.sides.find((s) => s.rosterId !== rosterId);
  if (!mine || !them) return null;
  const total = mine.points + them.points;
  const share = total > 0 ? mine.points / total : 0.5;
  const rival = teamFor(them.rosterId);
  const lead = mine.points - them.points;
  const scored = total > 0;
  return (
    <section className="u-game" aria-label={`Week ${week} game`} data-live={(live && scored) || undefined}>
      <p className="u-game-head">
        <span>Week {week}</span>
        {live && scored && <span className="xp-tag home-live">Live</span>}
        <span className="u-game-call">
          {!scored ? "Kickoff pending" : lead === 0 ? "Level" : lead > 0 ? `You lead by ${lead.toFixed(1)}` : `You trail by ${(-lead).toFixed(1)}`}
        </span>
      </p>
      <div className="u-game-sides">
        <span className="u-game-pts" data-ahead={lead > 0 || undefined}>
          <CountUp value={mine.points} decimals={2} empty="-" />
        </span>
        <span className="u-game-vs">vs</span>
        <span className="u-game-pts" data-ahead={lead < 0 || undefined}>
          <CountUp value={them.points} decimals={2} empty="-" />
        </span>
        <DrillLink to={teamLink(LEAGUE_ID, them.rosterId)} className="u-game-rival">
          <TeamAvatar name={rival.name} url={rival.avatarUrl} size={28} className="u-game-avatar" />
          <span className="truncate">{rival.name}</span>
        </DrillLink>
      </div>
      <div
        className="u-game-bar"
        role="img"
        aria-label={scored ? `${Math.round(share * 100)}% of the points are yours` : "No points yet"}
        style={{ "--share": share } as CSSProperties}
      >
        <span className="u-game-bar-mine" />
      </div>
    </section>
  );
}
