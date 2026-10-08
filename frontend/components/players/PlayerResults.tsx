"use client";

import { InjuryBadge } from "@/components/xp/InjuryBadge";
import { NflTeamLink } from "@/components/xp/NflTeamLink";
import { PlayerFace } from "@/components/xp/PlayerFace";
import { PlayerLink } from "@/components/xp/PlayerLink";
import { TeamLink } from "@/components/xp/TeamLink";
import type { Team } from "@/lib/league/use-league";
import { designation } from "@/lib/nfl/injury";
import type { SortKey } from "@/lib/players/params";
import type { PlayerRow } from "@/lib/players/rows";

const pts = (n: number | null) => (n === null ? "-" : n.toFixed(1));
const int = (n: number | null) => (n === null || n === 0 ? "-" : Math.round(n).toLocaleString("en-US"));

interface Column {
  sort: SortKey;
  label: string;
  // The header's full name, for a narrow column's short label.
  title: string;
  cell: (r: PlayerRow) => string;
}

interface PlayerResultsProps {
  rows: PlayerRow[];
  sort: SortKey;
  desc: boolean;
  onSort: (sort: SortKey) => void;
  mine: number | null;
  teamFor: (rosterId: number) => Team;
  week: number | null;
  showRos: boolean;
}

export function PlayerResults({ rows, sort, desc, onSort, mine, teamFor, week, showRos }: PlayerResultsProps) {
  const columns: Column[] = [
    { sort: "age", label: "Age", title: "Age", cell: (r) => (r.age === null ? "-" : String(r.age)) },
    { sort: "pts", label: "Pts", title: "Season points", cell: (r) => pts(r.pts) },
    { sort: "ppg", label: "PPG", title: "Points per game", cell: (r) => pts(r.ppg) },
    { sort: "rank", label: "Rank", title: "Season position rank", cell: (r) => (r.rank === null ? "-" : `${r.position}${r.rank}`) },
    ...(week === null ? [] : [{ sort: "proj" as const, label: `Wk ${week}`, title: `Week ${week} projection`, cell: (r: PlayerRow) => pts(r.proj) }]),
    ...(showRos ? [{ sort: "ros" as const, label: "ROS", title: "Rest-of-season average projection", cell: (r: PlayerRow) => pts(r.ros) }] : []),
    { sort: "value", label: "Value", title: "Dynasty value (FantasyCalc)", cell: (r) => int(r.value) },
  ];

  return (
    <>
      <table className="xp-table pl-table">
        <caption className="sr-only">Players, sorted by {columns.find((c) => c.sort === sort)?.title ?? sort}</caption>
        <thead>
          <tr>
            <th scope="col" className="pl-col-player">
              Player
            </th>
            <th scope="col" className="pl-col-team">
              CLT team
            </th>
            {columns.map((c) => (
              <th key={c.sort} scope="col" className="pl-col-num" aria-sort={c.sort === sort ? (desc ? "descending" : "ascending") : undefined}>
                <button type="button" className="pl-sort-head" title={c.title} onClick={() => onSort(c.sort)}>
                  {c.label}
                  {c.sort === sort && <span aria-hidden>{desc ? " ▾" : " ▴"}</span>}
                  <span className="sr-only">, sort by {c.title}</span>
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} data-mine={(mine !== null && r.owner === mine) || undefined}>
              <td className="pl-col-player">
                <Who row={r} />
              </td>
              <td className="pl-col-team">
                <Owner row={r} mine={mine} teamFor={teamFor} />
              </td>
              {columns.map((c) => (
                <td key={c.sort} className="pl-col-num" data-sorted={c.sort === sort || undefined}>
                  {c.cell(r)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <ul className="pl-cards" aria-label="Players">
        {rows.map((r) => (
          <li key={r.id} className="pl-card" data-mine={(mine !== null && r.owner === mine) || undefined}>
            <div className="pl-card-head">
              <Who row={r} />
              <Owner row={r} mine={mine} teamFor={teamFor} />
            </div>
            <dl className="pl-card-stats">
              {columns.map((c) => (
                <div key={c.sort} data-sorted={c.sort === sort || undefined}>
                  <dt title={c.title}>{c.label}</dt>
                  <dd>{c.cell(r)}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </>
  );
}

function Who({ row }: { row: PlayerRow }) {
  const d = designation(row.player);
  return (
    <span className="pl-who">
      <PlayerFace id={row.id} position={row.position} size={28} className="xp-face-sm" />
      <span className="pl-who-text">
        <PlayerLink id={row.id} className="pl-name">
          {row.name}
        </PlayerLink>
        <span className="pl-meta">
          <span className="pl-pos">{row.position}</span>
          <NflTeamLink team={row.team} />
          {d && <InjuryBadge designation={d} bodyPart={row.player.injury_body_part} />}
          {row.rookie && <span className="xp-tag">Rookie</span>}
        </span>
      </span>
    </span>
  );
}

const SLOT_TAG = { taxi: "Taxi", ir: "IR" } as const;

function Owner({ row, mine, teamFor }: { row: PlayerRow; mine: number | null; teamFor: (rosterId: number) => Team }) {
  if (row.owner === null) return <span className="pl-free">Available</span>;
  const team = teamFor(row.owner);
  return (
    <span className="pl-owner">
      <TeamLink rosterId={row.owner} name={team.name} avatarUrl={team.avatarUrl} isMine={row.owner === mine} />
      {row.slot !== "active" && row.slot !== null && <span className="xp-tag">{SLOT_TAG[row.slot]}</span>}
    </span>
  );
}
