"use client";

import { useId, useState } from "react";

import { HexagonChart } from "@/components/analyzer/HexagonChart";
import { DrillLink } from "@/components/xp/DrillLink";
import { TeamName } from "@/components/xp/TeamName";
import { LoadError } from "@/components/xp/LoadError";
import { PlayerLink } from "@/components/xp/PlayerLink";
import { type Tab, Tabs } from "@/components/xp/Tabs";
import { analyze, AXES, type AxisValues, leagueShape, standing, type TeamAnalysis } from "@/lib/analyzer/analysis";
import { recommendTrades, type TradePlayer } from "@/lib/analyzer/trades";
import { type Values, values as valuesResource } from "@/lib/analyzer/values";
import { LEAGUE_ID } from "@/lib/config";
import type { WindowParams } from "@/lib/desktop/windows";
import type { Player } from "@/lib/api/players";
import { refreshPlayers, usePlayers } from "@/lib/league/players";
import { rosterOf } from "@/lib/sleeper/rosters";
import type { SleeperRoster } from "@/lib/sleeper/types";
import { loadLeagueData, useMySleeperId } from "@/lib/team/data";
import { teamLink } from "@/lib/team/links";
import { useLoad } from "@/lib/use-load";

import "./analyzer.css";

const fmt = (n: number) => Math.round(n).toLocaleString("en-US");

export function AnalyzerWindow({ params }: { params: WindowParams }) {
  const [league, retryLeague] = useLoad(() => loadLeagueData(LEAGUE_ID), LEAGUE_ID);
  const players = usePlayers();
  const values = valuesResource.use();
  const me = useMySleeperId();

  if (league.status === "error") return <LoadError what="the league from Sleeper" message={league.message} onRetry={retryLeague} />;
  if (values.status === "error") return <LoadError what="FantasyCalc values" message={values.message} onRetry={() => valuesResource.refresh()} />;
  if (players.status === "error") return <LoadError what="player names" message={players.message} onRetry={refreshPlayers} />;
  if (league.status === "loading" || values.status === "loading" || players.status === "loading") {
    return <p role="status">Fetching player values...</p>;
  }

  const { rosters, users } = league.value;
  if (rosters.length === 0) return <p>The league has no teams yet.</p>;
  const teams = rosters.map((r) => analyze(r, users, players.players, values.values));
  const mine = me ? rosterOf(rosters, me) : null;

  const tabs: Tab[] = [
    { id: "compare", label: "Compare", panel: () => <Compare teams={teams} mine={mine} /> },
    { id: "league", label: "League", panel: () => <LeagueRanks teams={teams} mine={mine} /> },
    {
      id: "trades",
      label: "Trades",
      panel: () => <Trades teams={teams} mine={mine} rosters={rosters} players={players.players} values={values.values} />,
    },
  ];
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs">Roster value by position group, from FantasyCalc dynasty superflex values.</p>
      <Tabs label="Team Analyzer views" tabs={tabs} selected={params.tab} />
    </div>
  );
}

const byTotal = (teams: TeamAnalysis[]) => [...teams].sort((a, b) => b.total - a.total);

interface ViewProps {
  teams: TeamAnalysis[];
  mine: number | null;
}

function Compare({ teams, mine }: ViewProps) {
  const id = useId();
  const ranked = byTotal(teams);
  const [teamId, setTeamId] = useState(mine ?? ranked[0].rosterId);
  const [vsId, setVsId] = useState<number | null>(null);
  const team = teams.find((t) => t.rosterId === teamId) ?? ranked[0];
  const vs = teams.find((t) => t.rosterId === vsId && t.rosterId !== team.rosterId) ?? null;
  const shape = leagueShape(teams);

  return (
    <div className="flex flex-col gap-3">
      <div className="analyzer-pickers">
        <label htmlFor={`${id}-team`} className="font-bold">
          Team
        </label>
        <select id={`${id}-team`} className="xp-select" value={team.rosterId} onChange={(e) => setTeamId(Number(e.target.value))}>
          {ranked.map((t) => (
            <option key={t.rosterId} value={t.rosterId}>
              {t.name}
              {t.rosterId === mine ? " (you)" : ""}
            </option>
          ))}
        </select>
        <label htmlFor={`${id}-vs`} className="font-bold">
          Compare against
        </label>
        <select
          id={`${id}-vs`}
          className="xp-select"
          value={vs?.rosterId ?? ""}
          onChange={(e) => setVsId(e.target.value ? Number(e.target.value) : null)}
        >
          <option value="">League average only</option>
          {ranked
            .filter((t) => t.rosterId !== team.rosterId)
            .map((t) => (
              <option key={t.rosterId} value={t.rosterId}>
                {t.name} ({fmt(t.total)})
              </option>
            ))}
        </select>
      </div>

      <div className="analyzer-compare">
        <figure className="analyzer-figure">
          <HexagonChart
            primary={team.axes}
            comparison={vs?.axes}
            average={shape.average}
            max={shape.max}
            label={`${team.name}'s roster value by position group${vs ? ` against ${vs.name}` : ""}, with the league average`}
          />
          <figcaption className="analyzer-legend">
            <span data-series="primary">{team.name}</span>
            {vs && <span data-series="comparison">{vs.name}</span>}
            <span data-series="average">League average</span>
          </figcaption>
        </figure>
        <Breakdown team={team} vs={vs} average={shape.average} max={shape.max} averageTotal={shape.averageTotal} />
      </div>
    </div>
  );
}

interface BreakdownProps {
  team: TeamAnalysis;
  vs: TeamAnalysis | null;
  average: AxisValues;
  max: AxisValues;
  averageTotal: number;
}

function Breakdown({ team, vs, average, max, averageTotal }: BreakdownProps) {
  return (
    <table className="xp-table analyzer-breakdown">
      <caption className="sr-only">Value by position group</caption>
      <thead>
        <tr>
          <th scope="col" className="w-16">Group</th>
          <th scope="col">
            <span className="sr-only">Share of the league best</span>
          </th>
          <th scope="col" className="w-20 text-right">Team</th>
          <th scope="col" className="w-20 text-right">{vs ? "Them" : "Avg"}</th>
        </tr>
      </thead>
      <tbody>
        {AXES.map((a) => (
          <tr key={a}>
            <th scope="row">{a}</th>
            <td>
              <Bar value={team.axes[a]} max={max[a]} />
            </td>
            <td className="text-right">
              <Value value={team.axes[a]} average={average[a]} />
            </td>
            <td className="text-right tabular-nums">{fmt(vs ? vs.axes[a] : average[a])}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <th scope="row" colSpan={2}>
            Total roster value
          </th>
          <td className="text-right">
            <Value value={team.total} average={averageTotal} />
          </td>
          <td className="text-right tabular-nums">{fmt(vs ? vs.total : averageTotal)}</td>
        </tr>
      </tfoot>
    </table>
  );
}

function Bar({ value, max }: { value: number; max: number }) {
  return (
    <span className="analyzer-bar" aria-hidden>
      <span style={{ width: `${max > 0 ? Math.min(100, (value / max) * 100) : 0}%` }} />
    </span>
  );
}

const STANDING_TEXT = { above: "above the league average", below: "well below the league average", even: "" };

// Strengths and holes are marked by shape and a spoken note, not only color.
function Value({ value, average }: { value: number; average: number }) {
  const s = standing(value, average);
  return (
    <span className="analyzer-value" data-standing={s}>
      {fmt(value)}
      {s !== "even" && <span className="sr-only">, {STANDING_TEXT[s]}</span>}
    </span>
  );
}

function LeagueRanks({ teams, mine }: ViewProps) {
  const shape = leagueShape(teams);
  return (
    <div className="flex flex-col gap-3">
      <dl className="analyzer-averages" aria-label="League averages">
        {AXES.map((a) => (
          <div key={a}>
            <dt>{a}</dt>
            <dd>{fmt(shape.average[a])}</dd>
          </div>
        ))}
        <div>
          <dt>Total</dt>
          <dd>{fmt(shape.averageTotal)}</dd>
        </div>
      </dl>
      <p className="analyzer-key text-xs">
        <span data-standing="above">Above average</span>
        <span data-standing="below">Well below average</span>
      </p>
      <div className="xp-table-scroll">
        <table className="xp-table analyzer-ranks">
          <caption className="sr-only">Teams ranked by total roster value</caption>
          <thead>
            <tr>
              <th scope="col" className="w-8 text-right">#</th>
              <th scope="col" className="analyzer-team-col">Team</th>
              {AXES.map((a) => (
                <th key={a} scope="col" className="text-right">
                  {a}
                </th>
              ))}
              <th scope="col" className="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {byTotal(teams).map((t, i) => (
              <tr key={t.rosterId} data-mine={t.rosterId === mine || undefined}>
                <td className="text-right tabular-nums">{i + 1}</td>
                <td className="analyzer-team-col">
                  <DrillLink to={teamLink(LEAGUE_ID, t.rosterId)} className="max-w-full">
                    <TeamName name={t.name} avatarUrl={t.avatarUrl} />
                  </DrillLink>
                  {t.rosterId === mine && <span className="sr-only"> (your team)</span>}
                </td>
                {AXES.map((a) => (
                  <td key={a} className="text-right">
                    <Value value={t.axes[a]} average={shape.average[a]} />
                  </td>
                ))}
                <td className="text-right font-bold tabular-nums">{fmt(t.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface TradesProps extends ViewProps {
  rosters: SleeperRoster[];
  players: Record<string, Player>;
  values: Values;
}

const pct = (n: number) => `${Math.round(n * 100)}%`;

function Trades({ teams, mine, rosters, players, values }: TradesProps) {
  const id = useId();
  const ranked = byTotal(teams);
  const [teamId, setTeamId] = useState(mine ?? ranked[0].rosterId);
  const team = teams.find((t) => t.rosterId === teamId) ?? ranked[0];
  const { weak, strong, trades } = recommendTrades(team, teams, rosters, players, values);
  const yours = team.rosterId === mine;

  return (
    <div className="flex flex-col gap-3">
      <div className="analyzer-pickers">
        <label htmlFor={`${id}-team`} className="font-bold">
          Trades for
        </label>
        <select id={`${id}-team`} className="xp-select" value={team.rosterId} onChange={(e) => setTeamId(Number(e.target.value))}>
          {ranked.map((t) => (
            <option key={t.rosterId} value={t.rosterId}>
              {t.name}
              {t.rosterId === mine ? " (you)" : ""}
            </option>
          ))}
        </select>
      </div>
      <p className="text-xs">
        One-for-one swaps within 5% in value: a player from a position where {yours ? "you are" : "the team is"} 5% over
        the league average, for a partner&rsquo;s best player where {yours ? "you are" : "it is"} 15% under.
      </p>
      <div aria-live="polite">
        {weak.length === 0 ? (
          <p className="analyzer-empty">No starting position is 15% under the league average, so there is no hole to fill.</p>
        ) : strong.length === 0 ? (
          <p className="analyzer-empty">
            Short at {weak.join(", ")}, but no starting position is 5% over the league average to trade from.
          </p>
        ) : trades.length === 0 ? (
          <p className="analyzer-empty">
            Short at {weak.join(", ")} and deep at {strong.join(", ")}, but no partner has a fair one-for-one to offer.
          </p>
        ) : (
          <ol className="analyzer-trades">
            {trades.map((t) => (
              <li key={`${t.partner.rosterId}:${t.give.id}:${t.receive.id}`} className="analyzer-trade">
                <h3 className="analyzer-trade-head">
                  <span>With</span>
                  <DrillLink to={teamLink(LEAGUE_ID, t.partner.rosterId)} className="min-w-0">
                    <TeamName name={t.partner.name} avatarUrl={t.partner.avatarUrl} />
                  </DrillLink>
                </h3>
                <dl className="analyzer-trade-sides">
                  <TradeSide label="Give" player={t.give} />
                  <TradeSide label="Get" player={t.receive} />
                </dl>
                <p className="text-xs">
                  Adds {fmt(t.improvement)} at {t.receive.position}. Values {t.gap === 0 ? "match" : `${pct(t.gap)} apart`}.
                </p>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

function TradeSide({ label, player }: { label: string; player: TradePlayer }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>
        <PlayerLink id={player.id} className="font-bold break-words">
          {player.name}
        </PlayerLink>
        <span className="analyzer-trade-meta">
          {player.position} · {fmt(player.value)}
        </span>
      </dd>
    </div>
  );
}
