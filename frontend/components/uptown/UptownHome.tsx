"use client";

import { type Ref, useContext } from "react";

import { DrillContext } from "@/lib/desktop/navigation";
import { REGISTRY } from "@/lib/desktop/registry";
import { leagueWeek, weekOf } from "@/lib/league/default-week";
import { type LeagueData, useLeague } from "@/lib/league/use-league";

import "./uptown-home.css";

function kicker(data: LeagueData | null): string {
  if (!data) return "Charlotte, NC";
  const { league } = data;
  if (league.status !== "in_season") return `${league.season} season`;
  const week = leagueWeek(league, data.nfl);
  return `Week ${week} of ${weekOf(league, week)} · ${league.season}`;
}

function lede(data: LeagueData | null): string {
  if (!data) return "Standings, scores, drafts and rule proposals for the league.";
  const { league, rosters } = data;
  const teams = `${rosters.length} teams, superflex, full PPR.`;
  if (league.status === "pre_draft" || league.status === "drafting") return `The ${league.season} season starts with the draft. ${teams}`;
  if (league.status === "complete") return `The ${league.season} season is in the books. ${teams}`;
  return `${teams} Here is where the week stands.`;
}

interface UptownHomeProps {
  ref?: Ref<HTMLHeadingElement>;
  // The phone's bar holds the page's h1, so the hero title steps down to an h2.
  phone?: boolean;
}

// Home's own cards under an Uptown hero. The cards are the Home window's body,
// so both themes show the same dashboard.
export function UptownHome({ ref, phone = false }: UptownHomeProps) {
  const { data } = useLeague();
  const open = useContext(DrillContext);
  const Title = phone ? "h2" : "h1";
  const Cards = REGISTRY.home.component;

  return (
    <div className="u-home">
      <section aria-label="This week" className="u-hero">
        <div className="u-hero-copy">
          <p className="u-hero-kicker">{kicker(data)}</p>
          <Title ref={ref} tabIndex={-1} className="u-hero-title">
            The Queen City&rsquo;s <span>dynasty league</span>
          </Title>
          <p className="u-hero-lede">{lede(data)}</p>
        </div>
        {!phone && (
          <div className="u-hero-ctas">
            <button type="button" className="u-cta u-cta-go" onClick={() => open({ kind: "scores", params: {} })}>
              This week&rsquo;s scores
            </button>
            <button type="button" className="u-cta" onClick={() => open({ kind: "standings", params: {} })}>
              Standings
            </button>
          </div>
        )}
      </section>
      <Cards params={{}} />
    </div>
  );
}
