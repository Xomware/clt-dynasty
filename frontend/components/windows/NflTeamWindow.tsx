"use client";

import Image from "next/image";

import { DrillLink } from "@/components/xp/DrillLink";
import { LoadError } from "@/components/xp/LoadError";
import { PlayerFace } from "@/components/xp/PlayerFace";
import { PlayerLink } from "@/components/xp/PlayerLink";
import { TeamLink } from "@/components/xp/TeamLink";
import { type Player, playerName } from "@/lib/api/players";
import { LEAGUE_ID } from "@/lib/config";
import type { WindowParams } from "@/lib/desktop/windows";
import { nflSchedule } from "@/lib/league/cache";
import { refreshPlayers, usePlayers } from "@/lib/league/players";
import { teamOf } from "@/lib/league/use-league";
import { depthChart } from "@/lib/nfl/depth";
import { NFL_TEAMS, type NflTeam, nflLogo, nflTeam, nflTeamName } from "@/lib/nfl/teams";
import { nflLink } from "@/lib/player/links";
import { byeWeek } from "@/lib/player/season";
import { rosterOf } from "@/lib/sleeper/rosters";
import { type LeagueData, loadLeagueData, useMySleeperId } from "@/lib/team/data";
import { injuryTag } from "@/lib/team/team";
import { useLoad } from "@/lib/use-load";

import "./nfl.css";
import "./team.css";

// `?open=nfl:LAC`.
export const readNflLink = (value: string) => (nflTeam(value) ? { team: value } : null);

export const nflTitle = (p: WindowParams) => {
  const t = nflTeam(String(p.team));
  return t ? nflTeamName(t) : "NFL Team";
};

const POSITION_NAMES: Record<string, string> = { QB: "Quarterbacks", RB: "Running backs", WR: "Wide receivers", TE: "Tight ends", K: "Kickers" };

async function loadTeamPage() {
  const data = await loadLeagueData(LEAGUE_ID);
  // The bye is a nicety; the depth chart doesn't wait on, or fail with, the schedule.
  const schedule = await nflSchedule(data.league.season).catch(() => []);
  return { data, schedule };
}

export function NflTeamWindow({ params }: { params: WindowParams }) {
  const team = nflTeam(String(params.team ?? ""));
  const [load, retry] = useLoad(loadTeamPage, "nfl-team");
  const players = usePlayers();

  if (!team) return <p role="alert">There is no NFL team {String(params.team ?? "")}.</p>;
  if (load.status === "loading" || players.status === "loading") return <p role="status">Loading the depth chart...</p>;
  if (load.status === "error") return <LoadError what="the league from Sleeper" message={load.message} onRetry={retry} />;
  if (players.status === "error") return <LoadError what="NFL players" message={players.message} onRetry={refreshPlayers} />;
  return <DepthChart team={team} players={players.players} data={load.value.data} bye={byeWeek(load.value.schedule, team.abbr)} />;
}

interface DepthChartProps {
  team: NflTeam;
  players: Record<string, Player>;
  data: LeagueData;
  bye: number | null;
}

function DepthChart({ team, players, data, bye }: DepthChartProps) {
  const me = useMySleeperId();
  const myRoster = me ? rosterOf(data.rosters, me) : null;
  const owners = new Map(data.rosters.flatMap((r) => (r.players ?? []).map((id) => [id, r.roster_id] as const)));
  const groups = depthChart(players, team.abbr);
  const owned = groups.flatMap((g) => [...g.charted, ...g.rest]).filter((p) => owners.has(p.player_id)).length;

  const row = (p: Player, rank: number | null) => {
    const rosterId = owners.get(p.player_id);
    const injury = injuryTag(p);
    return (
      <tr key={p.player_id}>
        <td className="tabular-nums">{rank ?? ""}</td>
        <td>
          <span className="team-player">
            <PlayerFace id={p.player_id} position={p.position} />
            <span className="min-w-0">
              <PlayerLink id={p.player_id} className="team-player-name">
                {playerName(p, p.player_id)}
              </PlayerLink>
              {/* The tag sits under the name, so a phone column keeps the name whole. */}
              <span className="team-player-meta nfl-meta">
                {p.number !== undefined && p.number > 0 && `#${p.number}`}
                {injury && (
                  <span className="xp-tag team-injury" title={p.injury_status}>
                    {injury}
                  </span>
                )}
              </span>
            </span>
          </span>
        </td>
        <td>
          {rosterId === undefined ? (
            <span className="nfl-fa">Free agent</span>
          ) : (
            <TeamLink rosterId={rosterId} {...teamOf(data.users, data.rosters.find((r) => r.roster_id === rosterId), rosterId)} isMine={rosterId === myRoster} />
          )}
        </td>
      </tr>
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <section aria-label={nflTeamName(team)} className="team-head">
        <span className="nfl-logo-tile" aria-hidden>
          <Image src={nflLogo(team.abbr)} alt="" width={56} height={56} unoptimized />
        </span>
        <div className="team-who">
          <h3 className="team-name">{nflTeamName(team)}</h3>
          <p className="text-xs">
            {team.division}
            {bye && `, bye in week ${bye}`}
          </p>
        </div>
        <p className="text-xs">
          {owned} on CLT rosters
        </p>
      </section>
      {groups.map((g) =>
        g.charted.length + g.rest.length === 0 ? null : (
          <section key={g.position} className="xp-group" aria-label={POSITION_NAMES[g.position]}>
            <h3 className="xp-group-title">{POSITION_NAMES[g.position]}</h3>
            <div className="xp-table-scroll">
              <table className="xp-table team-table nfl-table">
                <thead>
                  <tr>
                    <th scope="col" className="w-10">
                      <abbr title="Depth chart">{g.position}</abbr>
                    </th>
                    <th scope="col">Player</th>
                    <th scope="col" className="nfl-owner-col">CLT team</th>
                  </tr>
                </thead>
                <tbody>
                  {g.charted.map((p, i) => row(p, i + 1))}
                  {g.rest.length > 0 && (
                    <tr className="nfl-rest">
                      <td colSpan={3}>Off the depth chart</td>
                    </tr>
                  )}
                  {g.rest.map((p) => row(p, null))}
                </tbody>
              </table>
            </div>
          </section>
        ),
      )}
    </div>
  );
}

// Every team by division, each opening its depth chart.
export function NflTeamsWindow() {
  const divisions = [...new Set(NFL_TEAMS.map((t) => t.division))];
  return (
    <div className="nfl-divisions">
      {divisions.map((d) => (
        <section key={d} className="xp-group" aria-label={d}>
          <h3 className="xp-group-title">{d}</h3>
          <ul className="nfl-team-list">
            {NFL_TEAMS.filter((t) => t.division === d).map((t) => (
              <li key={t.abbr}>
                <DrillLink to={nflLink(t.abbr)} className="nfl-team-tile">
                  <Image src={nflLogo(t.abbr)} alt="" width={32} height={32} unoptimized className="nfl-team-logo" />
                  <span>{nflTeamName(t)}</span>
                </DrillLink>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
