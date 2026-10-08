"use client";

import { useContext } from "react";

import { DrillLink } from "@/components/xp/DrillLink";
import { NflTeamLink } from "@/components/xp/NflTeamLink";
import { PlayerFace } from "@/components/xp/PlayerFace";
import { PlayerLink } from "@/components/xp/PlayerLink";
import { LoadError } from "@/components/xp/LoadError";
import { StarIcon } from "@/components/xp/icons";
import { TeamAvatar } from "@/components/xp/TeamAvatar";
import { LEAGUE_ID } from "@/lib/config";
import { DrillContext } from "@/lib/desktop/navigation";
import type { WindowParams } from "@/lib/desktop/windows";
import { type Player, playerName } from "@/lib/api/players";
import { rosters as leagueRosters } from "@/lib/league/cache";
import { refreshPlayers, usePlayers } from "@/lib/league/players";
import { divisionName } from "@/lib/league/standings";
import { teamOf } from "@/lib/league/use-league";
import { rosterOf } from "@/lib/sleeper/rosters";
import type { SleeperLeague, SleeperRoster } from "@/lib/sleeper/types";
import { type LeagueData, loadLeagueData, useMySleeperId } from "@/lib/team/data";
import { leagueLink, profileLink } from "@/lib/team/links";
import { injuryTag, ordinal, rankOf, rosterGroups, slotLabel } from "@/lib/team/team";
import { useLoad } from "@/lib/use-load";

import "./team.css";

export function TeamWindow({ params }: { params: WindowParams }) {
  const leagueId = String(params.leagueId ?? LEAGUE_ID);
  return <TeamView leagueId={leagueId} rosterId={Number(params.rosterId)} />;
}

export function MyTeamWindow() {
  const me = useMySleeperId();
  const open = useContext(DrillContext);
  const [load, retry] = useLoad(() => leagueRosters(LEAGUE_ID), LEAGUE_ID);

  if (!me) {
    return (
      <div className="team-empty">
        <p>Link your Sleeper account in Settings so the site knows which team is yours.</p>
        <button type="button" className="xp-button" onClick={() => open({ kind: "settings", params: {} })}>
          Open Settings
        </button>
      </div>
    );
  }
  if (load.status === "loading") return <p role="status">Finding your team...</p>;
  if (load.status === "error") return <LoadError what="the league's rosters" message={load.message} onRetry={retry} />;
  const rosterId = rosterOf(load.value, me);
  if (rosterId === null) {
    return (
      <div className="team-empty" role="alert">
        <p>Your linked Sleeper account doesn&rsquo;t own a team in the CLT Dynasty League.</p>
        <button type="button" className="xp-button" onClick={() => open({ kind: "settings", params: {} })}>
          Open Settings
        </button>
      </div>
    );
  }
  return <TeamView leagueId={LEAGUE_ID} rosterId={rosterId} />;
}

interface TeamViewProps {
  leagueId: string;
  rosterId: number;
}

function TeamView({ leagueId, rosterId }: TeamViewProps) {
  const [load, retry] = useLoad(() => loadLeagueData(leagueId), leagueId);
  const me = useMySleeperId();

  if (load.status === "loading") return <p role="status">Loading the team...</p>;
  if (load.status === "error") return <LoadError what="the team from Sleeper" message={load.message} onRetry={retry} />;
  const data = load.value;
  const roster = data.rosters.find((r) => r.roster_id === rosterId);
  if (!roster) return <p role="alert">{data.league.name} has no roster {rosterId}.</p>;

  const isMine = leagueId === LEAGUE_ID && !!me && rosterOf(data.rosters, me) === rosterId;
  return (
    <div className="flex flex-col gap-3">
      <TeamHead data={data} roster={roster} isMine={isMine} />
      <Roster league={data.league} roster={roster} />
    </div>
  );
}

interface TeamHeadProps {
  data: LeagueData;
  roster: SleeperRoster;
  isMine: boolean;
}

function TeamHead({ data: { league, users, rosters }, roster, isMine }: TeamHeadProps) {
  const { name, avatarUrl: avatar } = teamOf(users, roster, roster.roster_id);
  const owner = users.find((u) => u.user_id === roster.owner_id);
  const rank = rankOf(rosters, roster.roster_id);
  const streak = /^(\d+)([WLT])$/.exec(rank?.standing.streak ?? "");
  const { wins, losses, ties } = roster.settings;
  const division = rank?.division ? divisionName(league, rank.standing.division) : null;

  return (
    <section aria-label={name} className="team-head">
      <TeamAvatar name={name} url={avatar} size={56} className="team-avatar" />
      <div className="team-who">
        <h3 className="team-name">
          <span className="truncate">{name}</span>
          {isMine && <StarIcon width={18} height={18} className="shrink-0" role="img" aria-hidden={false} aria-label="Your team" />}
        </h3>
        {owner && (
          <p className="flex min-w-0 gap-1 text-xs">
            Managed by
            <DrillLink to={profileLink(owner.user_id)}>
              <span className="truncate font-bold">{owner.display_name}</span>
            </DrillLink>
          </p>
        )}
      </div>
      <dl className="team-stats">
        <div>
          <dt>Record</dt>
          <dd>
            {wins}-{losses}
            {ties > 0 && `-${ties}`}
            {streak && <span className="team-streak" data-result={streak[2]}>{`${streak[2]}${streak[1]}`}</span>}
          </dd>
        </div>
        <div>
          <dt>PF / PA</dt>
          <dd>
            {rank?.standing.pf.toFixed(2)} / {rank?.standing.pa.toFixed(2)}
          </dd>
        </div>
        {rank && (
          <div>
            <dt>League</dt>
            <dd>
              <DrillLink to={leagueLink(league.league_id)}>
                {ordinal(rank.league)} of {rank.of}
              </DrillLink>
            </dd>
          </div>
        )}
        {rank?.division && division && (
          <div>
            <dt>{division}</dt>
            <dd>
              {ordinal(rank.division.rank)} of {rank.division.of}
            </dd>
          </div>
        )}
      </dl>
    </section>
  );
}

function Roster({ league, roster }: { league: SleeperLeague; roster: SleeperRoster }) {
  const state = usePlayers();
  if (state.status === "loading") return <p role="status">Loading player names...</p>;
  if (state.status === "error") return <LoadError what="player names" message={state.message} onRetry={refreshPlayers} />;
  if (!roster.players?.length) return <p className="team-empty">No players on this roster yet.</p>;
  const groups = rosterGroups(roster, league, state.players);
  const asRow = (id: string) => ({ key: id, label: state.players[id]?.position ?? "", id });

  return (
    <>
      <RosterTable title="Starters" players={state.players} rows={groups.starters.map((s) => ({ key: s.slot, label: slotLabel(s.slot), id: s.id }))} labelHeader="Slot" />
      <RosterTable title="Bench" players={state.players} rows={groups.bench.map(asRow)} />
      <RosterTable title="Taxi squad" players={state.players} rows={groups.taxi.map(asRow)} />
      <RosterTable title="Injured reserve" players={state.players} rows={groups.reserve.map(asRow)} />
    </>
  );
}

interface Row {
  key: string;
  label: string;
  id: string | null;
}

interface RosterTableProps {
  title: string;
  players: Record<string, Player>;
  rows: Row[];
  labelHeader?: string;
}

function RosterTable({ title, players, rows, labelHeader = "Pos" }: RosterTableProps) {
  if (rows.length === 0) return null;
  return (
    <section className="xp-group" aria-label={title}>
      <h3 className="xp-group-title">
        {title} <span className="team-count">({rows.length})</span>
      </h3>
      <div className="xp-table-scroll">
        <table className="xp-table xp-stack team-table">
          <thead>
            <tr>
              <th scope="col" className="w-14">{labelHeader}</th>
              <th scope="col">Player</th>
              <th scope="col" className="w-12 text-right">Age</th>
              <th scope="col" className="w-12 text-right" title="Years in the NFL">Exp</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={`${row.key}-${i}`}>
                <td className="stack-lead font-bold">{row.label}</td>
                <td className="stack-main">{row.id ? <PlayerCell id={row.id} player={players[row.id]} /> : <span className="team-open">Empty</span>}</td>
                <td className="text-right tabular-nums" data-label="Age">{row.id ? (players[row.id]?.age ?? "") : ""}</td>
                <td className="text-right tabular-nums" data-label="Exp">{row.id ? experience(players[row.id]) : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

const experience = (p: Player | undefined) => (p?.years_exp === undefined ? "" : p.years_exp === 0 ? "R" : p.years_exp);

function PlayerCell({ id, player }: { id: string; player: Player | undefined }) {
  const injury = injuryTag(player);
  return (
    <span className="team-player">
      <PlayerFace id={id} position={player?.position} />
      <span className="min-w-0">
        <PlayerLink id={id} className="team-player-name">
          {playerName(player, id)}
        </PlayerLink>
        {player && (
          <span className="team-player-meta">
            {player.position && `${player.position} · `}
            {player.position === "DEF" || !player.team ? (player.team ?? "FA") : <NflTeamLink team={player.team} />}
          </span>
        )}
      </span>
      {injury && (
        <span className="xp-tag team-injury" title={player?.injury_status}>
          {injury}
        </span>
      )}
    </span>
  );
}
