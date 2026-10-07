"use client";

import { type Ref, useState } from "react";

import { HomeCard } from "@/components/home/HomeCard";
import { LeaguePulse } from "@/components/home/LeaguePulse";
import { MovesCard } from "@/components/home/MovesCard";
import { ProposalsCard } from "@/components/home/ProposalsCard";
import { QuickActions } from "@/components/home/QuickActions";
import { TaxiCard } from "@/components/home/TaxiCard";
import { CupRace, StandingsRace } from "./home/Races";
import { Recaps } from "./home/Recaps";
import { Announcements } from "@/components/windows/HomeWindow";
import { DrillLink } from "@/components/xp/DrillLink";
import { TeamAvatar } from "@/components/xp/TeamAvatar";
import { LEAGUE_ID } from "@/lib/config";
import { leagueWeek, weekOf } from "@/lib/league/default-week";
import { divisionName, playoffSeeds, sortStandings } from "@/lib/league/standings";
import type { LeagueData, Team } from "@/lib/league/use-league";
import { type Game, useWeekGames } from "@/lib/league/use-week-games";
import { useMember } from "@/lib/member/use-member";
import { teamLink } from "@/lib/team/links";
import { ordinal } from "@/lib/team/team";
import { BrandMark } from "./BrandMark";
import { Flip } from "./Flip";
import { Led } from "./Led";
import { TRIVIA } from "./trivia";

import "@/components/windows/home.css";
import "./buzz-home.css";

interface BuzzHomeProps {
  ref?: Ref<HTMLHeadingElement>;
  phone?: boolean;
}

const record = (w: number, l: number, t: number) => `${w}-${l}${t > 0 ? `-${t}` : ""}`;

// Home in Buzz City: the league's lockup beside the member's own trading
// card, then the hub. The cards are the Home window's own where they exist,
// so XP and Buzz City say the same things.
export function BuzzHome({ ref, phone = false }: BuzzHomeProps) {
  const [week, setWeek] = useState<number>();
  const { data, games, error, teamFor, myRosterId } = useWeekGames(week);
  const member = useMember().state;
  const current = data ? leagueWeek(data.league, data.nfl) : undefined;
  if (current !== undefined && week !== current && data?.league.status === "in_season") setWeek(current);
  const inSeason = data?.league.status === "in_season";
  const live = inSeason && week !== undefined && week >= (data?.nfl.week ?? 0);
  const Title = phone ? "h2" : "h1";
  const movesWeek = data ? (week ?? Math.max(1, data.nfl.leg)) : undefined;
  const league = { teamFor, myRosterId };
  const kicker = !data ? "Charlotte, NC" : inSeason && week ? `Week ${week} of ${weekOf(data.league, week)} · ${data.league.season}` : `${data.league.season} season`;

  return (
    <div className="bz-home">
      <section aria-label="This week" className="bz-hero">
        <div className="bz-hero-copy">
          <p className="bz-tape">{kicker}</p>
          <Title ref={ref} tabIndex={-1} className="bz-hero-title">
            <BrandMark mark="lockup" alt="CLT Dynasty Fantasy Football" className="bz-hero-lockup" priority />
          </Title>
          <QuickActions className="bz-actions" />
        </div>
        <div className="bz-hero-card">
          {!data || member.status === "loading" ? (
            <div className="bz-tcard bz-tcard-skel" role="status">
              <span className="sr-only">Loading your team...</span>
            </div>
          ) : myRosterId === null ? (
            <div className="bz-tcard bz-tcard-empty">
              <BrandMark mark="football-hornet" alt="" className="bz-empty-mark" />
              <p>Your Sleeper account isn&rsquo;t linked to a CLT roster yet.</p>
              <DrillLink to={{ kind: "settings", params: {} }} className="bz-sticker-btn">
                Link it in Settings
              </DrillLink>
            </div>
          ) : (
            <MyCard data={data} games={games} week={week} live={live} teamFor={teamFor} rosterId={myRosterId} />
          )}
        </div>
      </section>
      <div className="home bz-hub">
        <Announcements />
        <div className="bz-hub-grid">
          <StandingsRace {...league} data={data} />
          <div className="bz-hub-side">
            <HomeCard title={inSeason && week ? `Week ${week} games` : "This week"} more={{ to: { kind: "scores", params: {} }, label: "Scores" }}>
              {error ? (
                <p role="alert">Couldn&rsquo;t reach Sleeper ({error}).</p>
              ) : !data || (inSeason && !games) ? (
                <p role="status">Loading this week...</p>
              ) : !inSeason ? (
                <p>This week&rsquo;s games show here once the season starts.</p>
              ) : games && games.length > 0 ? (
                <ul className="bz-games">
                  {games.map((g) => (
                    <GameTile key={g.id} game={g} live={live} teamFor={teamFor} mine={g.sides.some((s) => s.rosterId === myRosterId)} />
                  ))}
                </ul>
              ) : (
                <p>No games scheduled for Week {week}.</p>
              )}
            </HomeCard>
            <CupRace {...league} data={data} />
          </div>
        </div>
        <Recaps />
        <div className="bz-hub-trio">
          <MovesCard week={movesWeek} live={live} {...league} />
          <ProposalsCard />
          <TaxiCard {...league} />
        </div>
        <div className="bz-hub-foot">
          <LeaguePulse data={data} week={week} error={error} />
          <Fact />
        </div>
      </div>
    </div>
  );
}

interface MyCardProps {
  data: LeagueData;
  games: Game[] | null;
  week: number | undefined;
  live: boolean;
  teamFor: (rosterId: number) => Team;
  rosterId: number;
}

// The member's team as a trading card: picture, name banner, and the season
// on four scoreboard tiles. This week's game sits under it as an arena board.
function MyCard({ data, games, week, live, teamFor, rosterId }: MyCardProps) {
  const standings = sortStandings(data.rosters);
  const at = standings.findIndex((s) => s.rosterId === rosterId);
  const me = standings[at];
  const seed = playoffSeeds(standings).indexOf(rosterId) + 1;
  const team = teamFor(rosterId);
  const inSeeds = seed > 0 && seed <= data.league.settings.playoff_teams;
  const game = games?.find((g) => g.sides.some((s) => s.rosterId === rosterId));
  return (
    <>
      <article className="bz-tcard bz-deal" aria-label={`Your team, ${team.name}`}>
        <div className="bz-tcard-face">
          <p className="bz-tcard-top">
            <span>CLT Dynasty</span>
            <span>{data.league.season} series</span>
          </p>
          <div className="bz-tcard-photo">
            <TeamAvatar name={team.name} url={team.avatarUrl} size={160} className="bz-tcard-avatar" />
            {me && inSeeds && <span className="bz-seed">Seed {seed}</span>}
          </div>
          <DrillLink to={teamLink(LEAGUE_ID, rosterId)} className="bz-tcard-name">
            {team.name}
          </DrillLink>
          {me && <p className="bz-tcard-sub">{divisionName(data.league, me.division)}</p>}
          {me && (
            <dl className="bz-tiles">
              <div>
                <dt>Record</dt>
                <dd>
                  <Flip text={record(me.wins, me.losses, me.ties)} />
                </dd>
              </div>
              <div>
                <dt>Rank</dt>
                <dd>
                  <Flip text={ordinal(at + 1)} at={3} />
                </dd>
              </div>
              <div>
                <dt>Points</dt>
                <dd>
                  <Flip text={me.pf.toFixed(1)} at={6} />
                </dd>
              </div>
              <div>
                <dt>Streak</dt>
                <dd data-streak={me.streak.at(-1)}>
                  <Flip text={me.streak.replace(/^(\d+)([WLT])$/, "$2$1") || "-"} at={11} />
                </dd>
              </div>
            </dl>
          )}
        </div>
      </article>
      {week !== undefined && game && <Matchup game={game} week={week} live={live} teamFor={teamFor} rosterId={rosterId} />}
    </>
  );
}

interface MatchupProps {
  game: Game;
  week: number;
  live: boolean;
  teamFor: (rosterId: number) => Team;
  rosterId: number;
}

function Matchup({ game, week, live, teamFor, rosterId }: MatchupProps) {
  const mine = game.sides.find((s) => s.rosterId === rosterId);
  const them = game.sides.find((s) => s.rosterId !== rosterId);
  if (!mine || !them) return null;
  const scored = mine.points + them.points > 0;
  const lead = mine.points - them.points;
  const rival = teamFor(them.rosterId);
  const call = !scored ? "Kickoff pending" : lead === 0 ? "Dead even" : lead > 0 ? `Up ${lead.toFixed(1)}` : `Down ${(-lead).toFixed(1)}`;
  return (
    <section className="bz-matchup" aria-label={`Week ${week} game`} data-live={(live && scored) || undefined}>
      <p className="bz-matchup-head">
        <span>Week {week}</span>
        {live && scored && <span className="bz-live">Live</span>}
        <span>{call}</span>
      </p>
      <div className="bz-matchup-board">
        <p className="bz-matchup-side" data-ahead={lead > 0 || undefined}>
          <span className="bz-matchup-who">You</span>
          <span className="bz-matchup-pts"><Led text={scored ? mine.points.toFixed(1) : "00.0"} /></span>
        </p>
        <p className="bz-matchup-side" data-ahead={lead < 0 || undefined}>
          <DrillLink to={teamLink(LEAGUE_ID, them.rosterId)} className="bz-matchup-who">
            <span className="truncate">{rival.name}</span>
          </DrillLink>
          <span className="bz-matchup-pts"><Led text={scored ? them.points.toFixed(1) : "00.0"} /></span>
        </p>
      </div>
    </section>
  );
}

interface GameTileProps {
  game: Game;
  live: boolean;
  mine: boolean;
  teamFor: (rosterId: number) => Team;
}

function GameTile({ game, live, mine, teamFor }: GameTileProps) {
  const [a, b] = game.sides;
  if (!a || !b) return null;
  const scored = a.points + b.points > 0;
  const side = (s: typeof a, other: typeof a) => {
    const team = teamFor(s.rosterId);
    return (
      <span className="bz-game-side" data-ahead={(scored && s.points > other.points) || undefined}>
        <TeamAvatar name={team.name} url={team.avatarUrl} size={24} className="bz-avatar bz-avatar-sm" />
        <span className="truncate">{team.name}</span>
        <span className="bz-game-pts">{scored ? s.points.toFixed(1) : "-"}</span>
      </span>
    );
  };
  return (
    <li className="bz-game" data-me={mine || undefined} data-live={(live && scored) || undefined}>
      {side(a, b)}
      {side(b, a)}
    </li>
  );
}

// A Charlotte fact on a sticker, the next one a tap away. Starts on the day's
// fact, so a regular sees a new one each visit.
function Fact() {
  const [n, setN] = useState(() => Math.floor(Date.now() / 86_400_000) % TRIVIA.length);
  return (
    <HomeCard title="Did you know" className="bz-factcard">
      <p key={n} className="bz-factcard-text" aria-live="polite">
        {TRIVIA[n]}
      </p>
      <button type="button" className="bz-sticker-btn" onClick={() => setN((n + 1) % TRIVIA.length)}>
        Next fact
      </button>
      <svg className="bz-factcard-coin" viewBox="0 0 64 64" aria-hidden="true" focusable="false">
        <circle cx="32" cy="32" r="29" />
        <circle cx="32" cy="32" r="22" />
        <path d="M32 16l4.2 9.4 10.3 1-7.7 6.9 2.2 10.1L32 38.2l-9 5.2 2.2-10.1-7.7-6.9 10.3-1z" />
      </svg>
    </HomeCard>
  );
}
