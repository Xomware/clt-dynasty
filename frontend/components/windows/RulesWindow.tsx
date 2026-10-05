"use client";

import type { ReactNode } from "react";

import { Tabs } from "@/components/xp/Tabs";
import type { WindowParams } from "@/lib/desktop/windows";
import { pointsText, scoringGroups } from "@/lib/league/scoring";
import { divisionName } from "@/lib/league/standings";
import { useLeague } from "@/lib/league/use-league";
import type { SleeperLeague } from "@/lib/sleeper/types";

import { Payouts, RULEBOOK } from "./rules-content";
import "./league.css";

function Rulebook() {
  return (
    <div className="grid grid-cols-1 gap-2">
      {RULEBOOK.map((r) => (
        <details key={r.title} className="xp-group">
          <summary className="xp-summary-toggle">{r.title}</summary>
          <div className="rules-body">{r.body}</div>
        </details>
      ))}
    </div>
  );
}

// Scoring and settings come from Sleeper, so they stay true when the commissioner changes them.
function LeagueData({ children }: { children: (league: SleeperLeague) => ReactNode }) {
  const { data, error } = useLeague();
  if (error) return <p role="alert">Couldn&rsquo;t reach Sleeper ({error}). Close Rules and open it again to retry.</p>;
  if (!data) return <p role="status">Loading the league settings...</p>;
  return children(data.league);
}

function Scoring({ league }: { league: SleeperLeague }) {
  const groups = scoringGroups(league.scoring_settings, league.roster_positions);
  if (groups.length === 0) return <p>Sleeper lists no scoring settings for this league.</p>;
  return (
    <div className="@container">
      <div className="grid grid-cols-1 gap-3 @md:grid-cols-2">
        {groups.map((g) => (
          <section key={g.name} className="xp-group" aria-labelledby={`scoring-${g.name}`}>
            <h3 id={`scoring-${g.name}`} className="xp-group-title">
              {g.name}
            </h3>
            <dl className="xp-summary">
              {g.rules.map((r) => (
                <div key={r.key} className="contents">
                  <dt>{r.label}</dt>
                  <dd className="text-right">{pointsText(r.key, r.value)}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </div>
  );
}

const SLOT_NAMES: Record<string, string> = { SUPER_FLEX: "Superflex", FLEX: "Flex (RB/WR/TE)", BN: "Bench" };

function Settings({ league }: { league: SleeperLeague }) {
  const counts = new Map<string, number>();
  for (const p of league.roster_positions) counts.set(p, (counts.get(p) ?? 0) + 1);
  const s = league.settings;
  const divisions = Number(s.divisions ?? 0);
  const facts: [string, string][] = [
    ["Format", s.type === 2 ? "Dynasty" : s.type === 1 ? "Keeper" : "Redraft"],
    ["Teams", String(league.total_rosters)],
    ["Playoff teams", String(s.playoff_teams)],
    ["Playoffs start", `Week ${s.playoff_week_start}`],
    ["Trade deadline", s.trade_deadline ? `Week ${s.trade_deadline}` : "None"],
    ["Taxi slots", String(s.taxi_slots ?? 0)],
    ["IR slots", String(s.reserve_slots ?? 0)],
    ["Divisions", Array.from({ length: divisions }, (_, i) => divisionName(league, i + 1)).join(", ") || "None"],
  ];
  return (
    <div className="grid grid-cols-1 gap-3">
      <section className="xp-group" aria-labelledby="settings-slots">
        <h3 id="settings-slots" className="xp-group-title">
          Roster slots
        </h3>
        <dl className="xp-summary">
          {[...counts].map(([slot, n]) => (
            <div key={slot} className="contents">
              <dt>{SLOT_NAMES[slot] ?? slot}</dt>
              <dd>{n}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section className="xp-group" aria-labelledby="settings-league">
        <h3 id="settings-league" className="xp-group-title">
          League settings
        </h3>
        <dl className="xp-summary">
          {facts.map(([k, v]) => (
            <div key={k} className="contents">
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}

export function RulesWindow({ params }: { params: WindowParams }) {
  return (
    <Tabs
      label="Rules"
      selected={params.tab}
      tabs={[
        { id: "rulebook", label: "Rulebook", panel: () => <Rulebook /> },
        { id: "scoring", label: "Scoring", panel: () => <LeagueData>{(l) => <Scoring league={l} />}</LeagueData> },
        { id: "settings", label: "League settings", panel: () => <LeagueData>{(l) => <Settings league={l} />}</LeagueData> },
        {
          id: "payouts",
          label: "Payouts",
          panel: () => (
            <div className="rules-body">
              <Payouts />
            </div>
          ),
        },
      ]}
    />
  );
}
