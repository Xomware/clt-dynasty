"use client";

import Image from "next/image";

import { DrillLink } from "@/components/xp/DrillLink";
import { LoadError } from "@/components/xp/LoadError";
import { Tabs } from "@/components/xp/Tabs";
import type { Player } from "@/lib/api/players";
import { LEAGUE_ID } from "@/lib/config";
import type { WindowParams } from "@/lib/desktop/windows";
import { nflSchedule } from "@/lib/league/cache";
import { refreshPlayers, usePlayers } from "@/lib/league/players";
import { teamOf } from "@/lib/league/use-league";
import { depthChart } from "@/lib/nfl/depth";
import { useRanks } from "@/lib/nfl/use-ranks";
import { NFL_TEAMS, type NflTeam, nflLogo, nflTeam, nflTeamName } from "@/lib/nfl/teams";
import { nflLink } from "@/lib/player/links";
import { byeWeek } from "@/lib/player/season";
import { rosterOf } from "@/lib/sleeper/rosters";
import { type LeagueData, loadLeagueData, useMySleeperId } from "@/lib/team/data";
import { useLoad } from "@/lib/use-load";

import { NflField, type Owner } from "./NflField";
import { NflRoster } from "./NflRoster";

import "./nfl.css";
import "./team.css";

// `?open=nfl:LAC`.
export const readNflLink = (value: string) => (nflTeam(value) ? { team: value } : null);

export const nflTitle = (p: WindowParams) => {
  const t = nflTeam(String(p.team));
  return t ? nflTeamName(t) : "NFL Team";
};

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
  return <DepthChart team={team} players={players.players} data={load.value.data} bye={byeWeek(load.value.schedule, team.abbr)} tab={params.tab} />;
}

interface DepthChartProps {
  team: NflTeam;
  players: Record<string, Player>;
  data: LeagueData;
  bye: number | null;
  tab: WindowParams[string];
}

function DepthChart({ team, players, data, bye, tab }: DepthChartProps) {
  const ranks = useRanks();
  const me = useMySleeperId();
  const myRoster = me ? rosterOf(data.rosters, me) : null;
  const owners = new Map(data.rosters.flatMap((r) => (r.players ?? []).map((id) => [id, r.roster_id] as const)));
  const groups = depthChart(players, team.abbr);
  const owned = groups.flatMap((g) => [...g.charted, ...g.rest]).filter((p) => owners.has(p.player_id)).length;
  const ownerOf = (id: string): Owner | null => {
    const rosterId = owners.get(id);
    if (rosterId === undefined) return null;
    const roster = data.rosters.find((r) => r.roster_id === rosterId);
    return { rosterId, team: teamOf(data.users, roster, rosterId), mine: rosterId === myRoster };
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
      <Tabs
        label="Depth chart views"
        selected={tab}
        tabs={[
          { id: "field", label: "Depth chart", panel: () => <NflField team={team} players={players} ownerOf={ownerOf} ranks={ranks} /> },
          { id: "roster", label: "Roster", panel: () => <NflRoster team={team} players={players} ownerOf={ownerOf} ranks={ranks} /> },
        ]}
      />
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
