"use client";

import { type CSSProperties, useContext, useMemo, useState } from "react";

import { TeamLink } from "@/components/xp/TeamLink";
import type { WindowParams } from "@/lib/desktop/windows";
import { leagueWeek } from "@/lib/league/default-week";
import { divisionName, playoffSeeds, type Standing, sortStandings } from "@/lib/league/standings";
import { type Team, useLeague } from "@/lib/league/use-league";
import { ViewParamsContext } from "@/lib/view-params";
import { Flip } from "./Flip";
import { Led } from "./Led";

import "./buzz-board.css";

const streak = (s: string) => s.replace(/^(\d+)([WLT])$/, "$2$1");

interface RowsProps {
  rows: Standing[];
  seedOf: Map<number, number>;
  playoffTeams: number;
  teamFor: (rosterId: number) => Team;
  myRosterId: number | null;
  label: string;
}

function Rows({ rows, seedOf, playoffTeams, teamFor, myRosterId, label }: RowsProps) {
  return (
    <table className="bz-board-table">
      <caption className="sr-only">{label}</caption>
      <thead>
        <tr>
          <th scope="col">Pos</th>
          <th scope="col">Team</th>
          <th scope="col">W-L</th>
          <th scope="col" className="bz-wide">
            Strk
          </th>
          <th scope="col">PF</th>
          <th scope="col" className="bz-wide">
            PA
          </th>
          <th scope="col">Seed</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((s, i) => {
          const team = teamFor(s.rosterId);
          const seed = seedOf.get(s.rosterId) ?? 0;
          const st = streak(s.streak);
          return (
            <tr key={s.rosterId} data-me={s.rosterId === myRosterId || undefined} style={{ "--i": i } as CSSProperties}>
              <td className="bz-pos">
                <Flip text={String(i + 1).padStart(2, "0")} at={i} />
              </td>
              <td className="bz-team">
                <TeamLink rosterId={s.rosterId} name={team.name} avatarUrl={team.avatarUrl} isMine={s.rosterId === myRosterId} />
              </td>
              <td className="bz-num bz-amber">
                {s.wins}-{s.losses}
                {s.ties > 0 && `-${s.ties}`}
              </td>
              <td className="bz-num bz-wide" data-streak={st.charAt(0) || undefined}>
                {st || "-"}
              </td>
              <td className="bz-num">
                <Led text={s.pf.toFixed(1)} />
              </td>
              <td className="bz-num bz-wide bz-dim">
                <Led text={s.pa.toFixed(1)} />
              </td>
              <td>{seed <= playoffTeams ? <span className="bz-seed-chip">{seed}</span> : <span className="bz-dim">-</span>}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// Standings as the arena's center-hung scoreboard: marquee bulbs over an
// amber dot-matrix board, each row flipping in like a split-flap.
export function BuzzStandings({ params }: { params: WindowParams }) {
  const { data, error, teamFor, myRosterId } = useLeague();
  const patch = useContext(ViewParamsContext);
  const [own, setOwn] = useState(params.tab === "divisions" ? "divisions" : "league");
  const tab = patch ? (params.tab === "divisions" ? "divisions" : "league") : own;
  const rows = useMemo(() => (data ? sortStandings(data.rosters) : []), [data]);
  const seedOf = useMemo(() => new Map(playoffSeeds(rows).map((id, i) => [id, i + 1])), [rows]);

  if (error) return <p role="alert">Couldn&rsquo;t reach Sleeper ({error}). Open Standings again to retry.</p>;
  if (!data) return <p role="status" className="bz-board-wait">Warming up the board...</p>;
  if (rows.length === 0) return <p>No teams in the league yet.</p>;

  const playoffTeams = data.league.settings.playoff_teams;
  const divisions = [...new Set(rows.map((s) => s.division))].sort((a, b) => (a ?? 0) - (b ?? 0));
  const shared = { seedOf, playoffTeams, teamFor, myRosterId };
  const pick = (t: string) => (patch ? patch({ tab: t }) : setOwn(t));
  const week = data.league.status === "in_season" ? leagueWeek(data.league, data.nfl) : null;

  return (
    <div className="bz-standings">
      <div className="bz-board">
        <i className="bz-bulbs" aria-hidden />
        <div className="bz-board-head">
          <p className="bz-board-title">CLT Dynasty</p>
          <p className="bz-board-meta">
            {week ? `Week ${week}` : data.league.season}
            <span>Top {playoffTeams} play on</span>
          </p>
          <div role="group" aria-label="Standings view" className="bz-switch">
            {["league", ...(divisions.length > 1 ? ["divisions"] : [])].map((t) => (
              <button key={t} type="button" aria-pressed={tab === t} onClick={() => pick(t)}>
                {t === "league" ? "League" : "Divisions"}
              </button>
            ))}
          </div>
        </div>
        {tab === "divisions" ? (
          divisions.map((d) => (
            <section key={d ?? "none"} aria-labelledby={`bz-div-${d}`} className="bz-board-div">
              <h2 id={`bz-div-${d}`}>{divisionName(data.league, d)}</h2>
              <Rows label={`${divisionName(data.league, d)} standings`} rows={rows.filter((s) => s.division === d)} {...shared} />
            </section>
          ))
        ) : (
          <Rows label="League standings" rows={rows} {...shared} />
        )}
        <i className="bz-bulbs bz-bulbs-foot" aria-hidden />
      </div>
      <p className="bz-note">
        Seeds 1 to {Math.min(3, divisions.length)} go to the division winners, the rest to the best records left.
      </p>
    </div>
  );
}
