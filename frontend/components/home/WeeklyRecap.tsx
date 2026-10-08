"use client";

import { useId } from "react";

import { reportLink } from "@/components/windows/AIReviewWindow";
import { DrillLink } from "@/components/xp/DrillLink";
import { NewsFeedIcon } from "@/components/xp/icons";
import { LoadError } from "@/components/xp/LoadError";
import { Markdown } from "@/components/xp/Markdown";
import type { AIReport } from "@/lib/api/ai-reports";
import { matchupBlurb, recapParts, recapWeek, weeklyRecaps } from "@/lib/home/recap";
import { leagueMatchups } from "@/lib/league/cache";
import type { LeagueData, Team } from "@/lib/league/use-league";
import { useLoad } from "@/lib/use-load";
import { CardAction } from "./CardAction";
import { HomeCard } from "./HomeCard";

const EARLIER = 8;

interface WeeklyRecapProps {
  data: LeagueData | null;
  myRosterId: number | null;
  teamFor: (rosterId: number) => Team;
}

// The AI's latest weekly recap as Home's lead story, the member's own game
// called out, and the weeks before it a tap away.
export function WeeklyRecap({ data, myRosterId, teamFor }: WeeklyRecapProps) {
  const [load, retry] = useLoad(weeklyRecaps, "weekly-recaps");
  const rows = load.status === "ok" ? load.value : [];
  const [latest, ...earlier] = rows;

  return (
    <HomeCard title="Weekly recap" more={{ to: { kind: "ai-review", params: {} }, label: "All recaps" }} className="wr">
      {load.status === "loading" && <p role="status">Loading the latest recap...</p>}
      {load.status === "error" && <LoadError what="the weekly recaps" message={load.message} onRetry={retry} />}
      {load.status === "ok" && !latest && <p>No recaps yet. The AI writes one after every week.</p>}
      {latest && <Feature report={latest} data={data} myRosterId={myRosterId} teamFor={teamFor} />}
      {earlier.length > 0 && (
        <nav aria-label="Earlier recaps" className="wr-earlier">
          <ol className="wr-strip">
            {earlier.slice(0, EARLIER).map((r) => {
              const w = recapWeek(r.period);
              return (
                <li key={r.period}>
                  <DrillLink to={reportLink(r)} className="wr-chip">
                    <span className="wr-chip-week">{w ? `Week ${w.week}` : r.period}</span>
                    {w && <span className="wr-chip-season">{w.season}</span>}
                    <span className="wr-chip-title">{recapParts(r).title}</span>
                  </DrillLink>
                </li>
              );
            })}
          </ol>
        </nav>
      )}
    </HomeCard>
  );
}

interface FeatureProps extends WeeklyRecapProps {
  report: AIReport;
}

function Feature({ report, data, myRosterId, teamFor }: FeatureProps) {
  const id = useId();
  const { title, lede } = recapParts(report);
  const w = recapWeek(report.period);
  // Matchup ids are per season, so only this season's recap can use them.
  const current = w !== null && data !== null && w.season === data.league.season && myRosterId !== null;
  const [game] = useLoad(
    () => (current ? leagueMatchups(w.week, false).then((rows) => rows.find((m) => m.roster_id === myRosterId)?.matchup_id ?? null) : Promise.resolve(null)),
    `${report.period}/${current ? myRosterId : ""}`,
  );
  const blurb =
    myRosterId === null || (current && game.status === "loading")
      ? null
      : matchupBlurb(report, game.status === "ok" ? game.value : null, teamFor(myRosterId).name);

  return (
    <article className="wr-feature" aria-labelledby={id}>
      <p className="wr-kicker">
        <span className="xp-tag">Weekly recap</span>
        <span>{w ? `Week ${w.week}, ${w.season}` : report.period}</span>
      </p>
      <h4 id={id} className="wr-title">
        {title}
      </h4>
      {lede && <p className="wr-lede">{lede}</p>}
      {blurb && (
        <section className="wr-mine" aria-label="Your game">
          <p className="wr-mine-label">Your game</p>
          <Markdown text={blurb} />
        </section>
      )}
      <CardAction to={reportLink(report)} Icon={NewsFeedIcon}>
        Read the full recap
      </CardAction>
    </article>
  );
}
