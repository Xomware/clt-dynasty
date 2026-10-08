"use client";

import { useState } from "react";

import { InjuryBadge } from "@/components/xp/InjuryBadge";
import { PlayerFace } from "@/components/xp/PlayerFace";
import { PlayerLink } from "@/components/xp/PlayerLink";
import { TeamLink } from "@/components/xp/TeamLink";
import { type Player, playerName } from "@/lib/api/players";
import { designation, sidelined } from "@/lib/nfl/injury";
import { firstDirection, rosterRows, type SortKey, sortRows } from "@/lib/nfl/roster";
import type { NflTeam } from "@/lib/nfl/teams";
import type { RankLookup } from "@/lib/nfl/use-ranks";
import type { Owner } from "./NflField";

interface NflRosterProps {
  team: NflTeam;
  players: Record<string, Player>;
  ownerOf: (id: string) => Owner | null;
  ranks: RankLookup;
}

interface Column {
  key: SortKey;
  label: string;
  title: string;
  numeric?: boolean;
}

const fixed = (n: number | undefined) => (n === undefined ? "-" : n.toFixed(1));

// Every fantasy-position player on the team, sortable by the chart, the name,
// or any of the season, projection and dynasty columns.
export function NflRoster({ team, players, ownerOf, ranks }: NflRosterProps) {
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "depth", dir: "asc" });
  const rows = sortRows(rosterRows(players, team.abbr, ranks), sort.key, sort.dir);
  const wk = ranks.week ? `Wk ${ranks.week}` : "Week";
  const columns: Column[] = [
    { key: "season", label: "Pts", title: `${ranks.season ?? "Season"} points, CLT scoring`, numeric: true },
    { key: "seasonRank", label: "Rk", title: "Season rank at his position", numeric: true },
    { key: "proj", label: `${wk} proj`, title: `${wk} projected points, CLT scoring`, numeric: true },
    { key: "projRank", label: "Rk", title: `${wk} projected rank at his position`, numeric: true },
    { key: "dynasty", label: "Dyn value", title: "FantasyCalc dynasty superflex value", numeric: true },
    { key: "dynastyRank", label: "Rk", title: "Dynasty rank at his position", numeric: true },
  ];

  const header = (c: Column, className: string) => {
    const active = sort.key === c.key;
    return (
      <th key={c.key} scope="col" className={className} aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : undefined}>
        <button
          type="button"
          className="nfl-sort"
          data-numeric={c.numeric || undefined}
          title={c.title}
          onClick={() => setSort(active ? { key: c.key, dir: sort.dir === "asc" ? "desc" : "asc" } : { key: c.key, dir: firstDirection(c.key) })}
        >
          <abbr title={c.title}>{c.label}</abbr>
          <span className="nfl-sort-arrow" aria-hidden>
            {active ? (sort.dir === "asc" ? "▲" : "▼") : ""}
          </span>
        </button>
      </th>
    );
  };

  if (rows.length === 0) return <p className="xp-note">Sleeper lists nobody on the {team.name} at a fantasy position.</p>;

  return (
    <div className="xp-table-scroll nfl-roster-scroll">
      <table className="xp-table xp-stack team-table nfl-roster">
        <caption className="sr-only">
          {team.city} {team.name} roster with season, week {ranks.week ?? ""} projection and dynasty ranks. Column headers sort.
        </caption>
        <thead>
          <tr>
            {header({ key: "depth", label: "Pos", title: "Position and depth chart spot" }, "nfl-roster-pos")}
            {header({ key: "name", label: "Player", title: "Player name" }, "nfl-roster-player")}
            <th scope="col" className="nfl-roster-owner">
              CLT team
            </th>
            {columns.map((c) => header(c, c.key.endsWith("Rank") ? "nfl-roster-num nfl-roster-rank" : "nfl-roster-num"))}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ player: p, depth, ranks: r }) => {
            const d = designation(p);
            const owner = ownerOf(p.player_id);
            return (
              <tr key={p.player_id} data-sidelined={d && sidelined(d) ? "" : undefined}>
                <td className="stack-lead tabular-nums whitespace-nowrap">
                  {p.position}
                  {depth ?? <span className="sr-only"> off the chart</span>}
                </td>
                <td className="stack-main">
                  <span className="team-player">
                    <span className="nfl-roster-face" data-injured={d ? "" : undefined}>
                      <PlayerFace id={p.player_id} position={p.position} />
                    </span>
                    <span className="min-w-0">
                      <PlayerLink id={p.player_id} className="team-player-name">
                        {playerName(p, p.player_id)}
                      </PlayerLink>
                      <span className="team-player-meta nfl-meta">
                        {p.number !== undefined && p.number > 0 && `#${p.number}`}
                        {d && <InjuryBadge designation={d} bodyPart={p.injury_body_part} />}
                      </span>
                    </span>
                  </span>
                </td>
                <td className="stack-wide">
                  {owner ? <TeamLink rosterId={owner.rosterId} {...owner.team} isMine={owner.mine} /> : <span className="nfl-fa">Free agent</span>}
                </td>
                <td className="nfl-roster-num" data-label="Season">{fixed(r.season?.points)}</td>
                <td className="nfl-roster-num" data-label="Rk">{r.season ? `${r.season.position}${r.season.rank}` : "-"}</td>
                <td className="nfl-roster-num" data-label={`${wk} proj`}>{fixed(r.projected?.points)}</td>
                <td className="nfl-roster-num" data-label="Rk">{r.projected ? `${r.projected.position}${r.projected.rank}` : "-"}</td>
                <td className="nfl-roster-num" data-label="Dynasty">{r.dynasty ? r.dynasty.value.toLocaleString("en-US") : "-"}</td>
                <td className="nfl-roster-num" data-label="Rk">{r.dynasty ? `${r.dynasty.position}${r.dynasty.rank}` : "-"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
