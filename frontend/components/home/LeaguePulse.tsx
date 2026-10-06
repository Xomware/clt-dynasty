"use client";

import { useEffect, useState } from "react";

import { DrillLink } from "@/components/xp/DrillLink";
import { CalendarIcon, TrophyIcon } from "@/components/xp/icons";
import { LoadError } from "@/components/xp/LoadError";
import { TeamName } from "@/components/xp/TeamName";
import { LEAGUE_ID } from "@/lib/config";
import { reigningChampion } from "@/lib/home/champion";
import { countdown, upcomingDraft } from "@/lib/home/draft";
import { drafts as leagueDrafts } from "@/lib/league/cache";
import { lastLeagueWeek } from "@/lib/league/default-week";
import type { LeagueData } from "@/lib/league/use-league";
import { teamLink } from "@/lib/team/links";
import { useLoad } from "@/lib/use-load";
import { HomeCard } from "./HomeCard";

interface LeaguePulseProps {
  data: LeagueData | null;
  week: number | undefined;
  error: string | null;
}

// Three tiles across the top: where the season is, who holds the title, and the next draft.
export function LeaguePulse({ data, week, error }: LeaguePulseProps) {
  return (
    <div className="home-pulse">
      <SeasonTile data={data} week={week} error={error} />
      <ChampionTile />
      <DraftTile />
    </div>
  );
}

function phase(data: LeagueData, week: number | undefined): string {
  const { status, settings } = data.league;
  if (status === "pre_draft") return "Waiting on the startup draft";
  if (status === "drafting") return "Draft under way";
  if (status === "complete") return "Season complete";
  if (week === undefined) return "In season";
  if (week >= settings.playoff_week_start) return `Playoffs, round ${week - settings.playoff_week_start + 1}`;
  return `Regular season, playoffs start Week ${settings.playoff_week_start}`;
}

function SeasonTile({ data, week, error }: LeaguePulseProps) {
  return (
    <HomeCard title="League pulse" className="home-tile">
      {error ? (
        <p role="alert">Couldn&rsquo;t reach Sleeper ({error}).</p>
      ) : !data ? (
        <p role="status">Loading the season...</p>
      ) : (
        <>
          <p className="home-big">
            {data.league.status === "in_season" && week ? `Week ${week}` : data.league.season}
            {data.league.status === "in_season" && week && (
              <span className="home-big-label"> of {lastLeagueWeek(data.league)}</span>
            )}
          </p>
          <p className="text-xs">
            {data.league.season} season, {data.league.total_rosters} teams
          </p>
          <p className="text-xs">{phase(data, week)}</p>
        </>
      )}
    </HomeCard>
  );
}

function ChampionTile() {
  const [load, retry] = useLoad(reigningChampion, "champion");
  return (
    <HomeCard title="Reigning champion" className="home-tile" more={{ to: { kind: "history", params: {} }, label: "History" }}>
      {load.status === "loading" && <p role="status">Loading last season&rsquo;s final...</p>}
      {load.status === "error" && <LoadError what="last season's final" message={load.message} onRetry={retry} />}
      {load.status === "ok" && !load.value && <p>No champion crowned yet.</p>}
      {load.status === "ok" && load.value && (
        <div className="home-tile-body">
          <TrophyIcon width={32} height={32} className="flex-none" />
          <div className="min-w-0">
            <DrillLink to={teamLink(load.value.leagueId, load.value.rosterId)}>
              <TeamName name={load.value.team.name} avatarUrl={load.value.team.avatarUrl} />
            </DrillLink>
            <p className="text-xs">
              {load.value.season} champion{load.value.runnerUp && `, beat ${load.value.runnerUp.name} in the final`}
            </p>
          </div>
        </div>
      )}
    </HomeCard>
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

function DraftTile() {
  const [load, retry] = useLoad(() => leagueDrafts(LEAGUE_ID), LEAGUE_ID);
  const draft = load.status === "ok" ? upcomingDraft(load.value) : undefined;
  const start = draft?.start_time ?? null;
  const now = useNow(start !== null && draft?.status === "pre_draft");
  const live = draft && (draft.status !== "pre_draft" || (start !== null && start <= now));
  const clock = !draft ? null : live ? (draft.status === "paused" ? "Paused" : "Drafting now") : start !== null ? countdown(start - now) : null;

  return (
    <HomeCard title="Upcoming draft" className="home-tile" more={{ to: { kind: "draft-order", params: {} }, label: "Draft Order" }}>
      {load.status === "loading" && <p role="status">Loading the league&rsquo;s drafts...</p>}
      {load.status === "error" && <LoadError what="the league's drafts" message={load.message} onRetry={retry} />}
      {load.status === "ok" && !draft && <p>No draft on the calendar yet.</p>}
      {draft && (
        <div className="home-tile-body">
          <CalendarIcon width={32} height={32} className="flex-none" />
          <div className="min-w-0">
            <DrillLink to={{ kind: "drafts", params: {} }}>
              <span className="font-bold">{draft.season} Rookie Draft</span>
            </DrillLink>
            {start !== null ? <p className="text-xs">Starts {START.format(start)}</p> : <p className="text-xs">Start time not set yet.</p>}
            {/* Not a live region: a per-second announcement would drown everything else. */}
            {clock && <p className="home-countdown">{live ? clock : `Starts in ${clock}`}</p>}
          </div>
        </div>
      )}
    </HomeCard>
  );
}
