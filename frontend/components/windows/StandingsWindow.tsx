"use client";

import { useMemo } from "react";

import { Tabs } from "@/components/xp/Tabs";
import { CountUp } from "@/components/motion/CountUp";
import { TeamLink } from "@/components/xp/TeamLink";
import { divisionName, playoffSeeds, type Standing, sortStandings } from "@/lib/league/standings";
import { type Team, useLeague } from "@/lib/league/use-league";
import type { WindowParams } from "@/lib/desktop/windows";

import "./league.css";

interface TableProps {
  label: string;
  rows: Standing[];
  seedOf: Map<number, number>;
  playoffTeams: number;
  teamFor: (rosterId: number) => Team;
  myRosterId: number | null;
}

// Sleeper writes a streak as "3W"; standings read it the other way round.
const streak = (s: string) => s.replace(/^(\d+)([WLT])$/, "$2$1");

function StandingsTable({ label, rows, seedOf, playoffTeams, teamFor, myRosterId }: TableProps) {
  return (
    <div className="xp-table-scroll">
      <table className="xp-table">
        <caption className="sr-only">{label}</caption>
        <thead>
          <tr>
            <th scope="col" className="w-10">
              #
            </th>
            <th scope="col">Team</th>
            <th scope="col" className="w-16">
              W-L
            </th>
            <th scope="col" className="standings-extra w-16">
              Streak
            </th>
            <th scope="col" className="w-20 text-right">
              PF
            </th>
            <th scope="col" className="standings-extra w-20 text-right">
              PA
            </th>
            <th scope="col" className="w-14 text-right">
              Seed
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s, i) => {
            const team = teamFor(s.rosterId);
            const seed = seedOf.get(s.rosterId) ?? 0;
            return (
              <tr key={s.rosterId} className={seed <= playoffTeams ? "xp-in" : undefined}>
                <td className="tabular-nums">{i + 1}</td>
                <td className="md:max-w-0">
                  <TeamLink rosterId={s.rosterId} name={team.name} avatarUrl={team.avatarUrl} isMine={s.rosterId === myRosterId} />
                </td>
                <td className="tabular-nums">
                  {s.wins}-{s.losses}
                  {s.ties > 0 && `-${s.ties}`}
                </td>
                <td className="standings-extra tabular-nums">{streak(s.streak) || "-"}</td>
                <td className="text-right tabular-nums">
                  <CountUp value={s.pf} decimals={2} />
                </td>
                <td className="standings-extra text-right tabular-nums">{s.pa.toFixed(2)}</td>
                <td className="text-right tabular-nums">{seed <= playoffTeams ? seed : ""}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function StandingsWindow({ params }: { params: WindowParams }) {
  const { data, error, teamFor, myRosterId } = useLeague();
  const rows = useMemo(() => (data ? sortStandings(data.rosters) : []), [data]);
  const seedOf = useMemo(() => new Map(playoffSeeds(rows).map((id, i) => [id, i + 1])), [rows]);

  if (error) return <p role="alert">Couldn&rsquo;t reach Sleeper ({error}). Close Standings and open it again to retry.</p>;
  if (!data) return <p role="status">Loading the league...</p>;
  if (rows.length === 0) return <p>No teams in the league yet.</p>;

  const playoffTeams = data.league.settings.playoff_teams;
  const divisions = [...new Set(rows.map((s) => s.division))].sort((a, b) => (a ?? 0) - (b ?? 0));
  const table = { seedOf, playoffTeams, teamFor, myRosterId };

  return (
    <div className="grid grid-cols-1 gap-2">
      <Tabs
        label="Standings view"
        selected={params.tab}
        tabs={[
          {
            id: "league",
            label: "League",
            panel: () => <StandingsTable label="League standings" rows={rows} {...table} />,
          },
          ...(divisions.length > 1
            ? [
                {
                  id: "divisions",
                  label: "Divisions",
                  panel: () => (
                    <div className="grid gap-3">
                      {divisions.map((d) => (
                        <section key={d ?? "none"} aria-labelledby={`division-${d}`}>
                          <h3 id={`division-${d}`} className="xp-group-title">
                            {divisionName(data.league, d)}
                          </h3>
                          <StandingsTable
                            label={`${divisionName(data.league, d)} standings`}
                            rows={rows.filter((s) => s.division === d)}
                            {...table}
                          />
                        </section>
                      ))}
                    </div>
                  ),
                },
              ]
            : []),
        ]}
      />
      <p className="text-xs">
        Seeds 1 to {Math.min(3, divisions.length)} go to the division winners, the rest to the best records left. The
        top {playoffTeams} make the playoffs.
      </p>
    </div>
  );
}
