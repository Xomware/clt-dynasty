"use client";

import { type Ref, useState } from "react";

import { HomeCard } from "@/components/home/HomeCard";
import { LeaguePulse } from "@/components/home/LeaguePulse";
import { MovesCard } from "@/components/home/MovesCard";
import { ProposalsCard } from "@/components/home/ProposalsCard";
import { TaxiCard } from "@/components/home/TaxiCard";
import { Announcements, ThisWeek } from "@/components/windows/HomeWindow";
import { leagueWeek } from "@/lib/league/default-week";
import { useWeekGames } from "@/lib/league/use-week-games";
import { useMember } from "@/lib/member/use-member";
import { HomeHero } from "./home/HomeHero";
import { CupRace, StandingsRace } from "./home/Races";
import { Recaps } from "./home/Recaps";

import "@/components/windows/home.css";
import "./uptown-home.css";

interface UptownHomeProps {
  ref?: Ref<HTMLHeadingElement>;
  phone?: boolean;
}

// Uptown's hub: the member's team and this week's game up top, then the
// races, the recaps, and the league's comings and goings. The cards are the
// Home window's own where they exist, so XP and Uptown say the same things.
export function UptownHome({ ref, phone = false }: UptownHomeProps) {
  const [week, setWeek] = useState<number>();
  const { data, games, error, teamFor, myRosterId } = useWeekGames(week);
  const member = useMember().state;
  const current = data ? leagueWeek(data.league, data.nfl) : undefined;
  if (current !== undefined && week !== current && data?.league.status === "in_season") setWeek(current);
  const inSeason = data?.league.status === "in_season";
  const live = inSeason && week !== undefined && week >= (data?.nfl.week ?? 0);
  const movesWeek = data ? (week ?? Math.max(1, data.nfl.leg)) : undefined;
  const league = { teamFor, myRosterId };

  return (
    <div className="u-home">
      <HomeHero
        data={data}
        games={games}
        week={week}
        live={live}
        memberLoading={member.status === "loading"}
        headingRef={ref}
        phone={phone}
        {...league}
      />
      <div className="home u-hub">
        <Announcements />
        <div className="u-hub-grid">
          <StandingsRace data={data} {...league} />
          <div className="u-hub-side">
            <HomeCard title={inSeason && week ? `Week ${week} matchups` : "This week"} more={{ to: { kind: "scores", params: {} }, label: "Scores" }}>
              {error ? (
                <p role="alert">Couldn&rsquo;t reach Sleeper ({error}).</p>
              ) : !data || (inSeason && !games) ? (
                <p role="status">Loading this week...</p>
              ) : !inSeason ? (
                <p>This week&rsquo;s matchups show here once games begin.</p>
              ) : games && games.length > 0 ? (
                <ThisWeek games={games} live={live} {...league} />
              ) : (
                <p>No matchups scheduled for Week {week}.</p>
              )}
            </HomeCard>
            <CupRace data={data} {...league} />
          </div>
        </div>
        <Recaps />
        <div className="u-hub-trio">
          <MovesCard week={movesWeek} live={live} {...league} />
          <ProposalsCard />
          <TaxiCard {...league} />
        </div>
        <LeaguePulse data={data} week={week} error={error} />
      </div>
    </div>
  );
}
