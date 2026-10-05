"use client";

import { useId, useState } from "react";

import { Tabs } from "@/components/xp/Tabs";
import { TeamName } from "@/components/xp/TeamName";
import type { WindowParams } from "@/lib/desktop/windows";
import { headToHead, type PastGame, type Season, seasonTeam, useHistory } from "@/lib/league/history";
import { type Team, useLeague } from "@/lib/league/use-league";

import "./league.css";

const PLACES = ["Champion", "Runner-up", "3rd", "4th", "5th", "6th"];
const record = (w: number, l: number, t: number) => `${w}-${l}${t > 0 ? `-${t}` : ""}`;

function finalOf(s: Season): PastGame | undefined {
  const [champ, runner] = s.finish ?? [];
  return s.games.findLast(
    (g) => g.kind === "playoff" && g.sides.some((x) => x.rosterId === champ) && g.sides.some((x) => x.rosterId === runner),
  );
}

function Champions({ seasons, myRosterId }: { seasons: Season[]; myRosterId: number | null }) {
  return (
    <ol className="grid gap-2" aria-label="Champions by season">
      {seasons.map((s) => {
        const final = finalOf(s);
        const score = (id: number) => final?.sides.find((x) => x.rosterId === id)?.points.toFixed(2);
        const [champ, runner] = s.finish ?? [];
        return (
          <li key={s.league.league_id} className="xp-group">
            <h3 className="xp-group-title">{s.league.season}</h3>
            {s.finish ? (
              <dl className="xp-summary items-center">
                <dt>Champion</dt>
                <dd className="flex min-w-0 items-center gap-2">
                  <TeamName {...seasonTeam(s, champ)} isMine={champ === myRosterId} />
                  {final && <span className="xp-score">{score(champ)}</span>}
                </dd>
                <dt>Runner-up</dt>
                <dd className="flex min-w-0 items-center gap-2 font-normal">
                  <TeamName {...seasonTeam(s, runner)} isMine={runner === myRosterId} />
                  {final && <span className="xp-score">{score(runner)}</span>}
                </dd>
              </dl>
            ) : (
              <p>In progress. The final is week {s.league.settings.playoff_week_start + 2}.</p>
            )}
          </li>
        );
      })}
    </ol>
  );
}

function Standings({ seasons, myRosterId }: { seasons: Season[]; myRosterId: number | null }) {
  const picker = useId();
  const [pick, setPick] = useState(seasons[0].league.league_id);
  const s = seasons.find((x) => x.league.league_id === pick) ?? seasons[0];
  const place = (id: number) => {
    const i = s.finish?.indexOf(id) ?? -1;
    return i >= 0 ? PLACES[i] : "";
  };
  return (
    <div className="grid gap-2">
      <div className="flex items-center gap-2">
        <label htmlFor={picker} className="font-bold">
          Season
        </label>
        <select id={picker} className="xp-select" value={s.league.league_id} onChange={(e) => setPick(e.target.value)}>
          {seasons.map((x) => (
            <option key={x.league.league_id} value={x.league.league_id}>
              {x.league.season}
            </option>
          ))}
        </select>
      </div>
      <div className="xp-table-scroll">
        <table className="xp-table">
          <caption className="sr-only">{s.league.season} regular season standings</caption>
          <thead>
            <tr>
              <th scope="col" className="w-10">
                #
              </th>
              <th scope="col">Team</th>
              <th scope="col" className="w-16">
                W-L
              </th>
              <th scope="col" className="w-20 text-right">
                PF
              </th>
              <th scope="col" className="standings-extra w-20 text-right">
                PA
              </th>
              <th scope="col" className="w-24">
                Finish
              </th>
            </tr>
          </thead>
          <tbody>
            {s.standings.map((row, i) => (
              <tr key={row.rosterId}>
                <td className="tabular-nums">{i + 1}</td>
                <td className="md:max-w-0">
                  <TeamName {...seasonTeam(s, row.rosterId)} isMine={row.rosterId === myRosterId} />
                </td>
                <td className="tabular-nums">{record(row.wins, row.losses, row.ties)}</td>
                <td className="text-right tabular-nums">{row.pf.toFixed(2)}</td>
                <td className="standings-extra text-right tabular-nums">{row.pa.toFixed(2)}</td>
                <td>{place(row.rosterId)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!s.finish && <p className="text-xs">The {s.league.season} season is still being played.</p>}
    </div>
  );
}

interface RivalsProps {
  games: PastGame[];
  rosterIds: number[];
  teamFor: (rosterId: number) => Team;
  myRosterId: number | null;
}

function Rivals({ games, rosterIds, teamFor, myRosterId }: RivalsProps) {
  const picker = useId();
  // The member's own team until they pick another; theirs may load after this mounts.
  const [picked, setPick] = useState<number | null>(null);
  const pick = picked ?? myRosterId ?? rosterIds[0];
  const rows = headToHead(games, pick);
  const total = rows.reduce(
    (t, r) => ({ wins: t.wins + r.wins, losses: t.losses + r.losses, ties: t.ties + r.ties }),
    { wins: 0, losses: 0, ties: 0 },
  );
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={picker} className="font-bold">
          Team
        </label>
        <select id={picker} className="xp-select min-w-0" value={pick} onChange={(e) => setPick(Number(e.target.value))}>
          {rosterIds.map((id) => (
            <option key={id} value={id}>
              {teamFor(id).name}
            </option>
          ))}
        </select>
        <span className="tabular-nums">All-time {record(total.wins, total.losses, total.ties)}</span>
      </div>
      {rows.length === 0 ? (
        <p>No finished games for this team yet.</p>
      ) : (
        <div className="xp-table-scroll">
          <table className="xp-table">
            <caption className="sr-only">{teamFor(pick).name} head-to-head</caption>
            <thead>
              <tr>
                <th scope="col">Opponent</th>
                <th scope="col" className="w-16">
                  W-L
                </th>
                <th scope="col" className="w-20 text-right">
                  PF
                </th>
                <th scope="col" className="standings-extra w-20 text-right">
                  PA
                </th>
                <th scope="col" className="standings-extra w-16 text-right">
                  Games
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.opponent}>
                  <td className="md:max-w-0">
                    <TeamName {...teamFor(r.opponent)} isMine={r.opponent === myRosterId} />
                  </td>
                  <td className="tabular-nums">{record(r.wins, r.losses, r.ties)}</td>
                  <td className="text-right tabular-nums">{r.pf.toFixed(2)}</td>
                  <td className="standings-extra text-right tabular-nums">{r.pa.toFixed(2)}</td>
                  <td className="standings-extra text-right tabular-nums">{r.games}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs">
        Regular season and playoff games since {games.at(-1)?.season ?? "the first season"}, by roster. A roster that
        changed hands keeps its record.
      </p>
    </div>
  );
}

export function HistoryWindow({ params }: { params: WindowParams }) {
  const history = useHistory();
  const { data, error, teamFor, myRosterId } = useLeague();

  const failed = history.status === "error" ? history.message : error;
  if (failed) return <p role="alert">Couldn&rsquo;t reach Sleeper ({failed}). Close History and open it again to retry.</p>;
  if (history.status !== "ok" || !data) return <p role="status">Loading every season...</p>;
  const { seasons } = history;
  if (seasons.length === 0) return <p>No seasons have been played yet.</p>;

  const games = seasons.flatMap((s) => s.games);
  const rosterIds = data.rosters.map((r) => r.roster_id).sort((a, b) => a - b);
  return (
    <Tabs
      label="History view"
      selected={params.tab}
      tabs={[
        { id: "champions", label: "Champions", panel: () => <Champions seasons={seasons} myRosterId={myRosterId} /> },
        { id: "seasons", label: "Seasons", panel: () => <Standings seasons={seasons} myRosterId={myRosterId} /> },
        {
          id: "rivals",
          label: "Head-to-head",
          panel: () => <Rivals games={games} rosterIds={rosterIds} teamFor={teamFor} myRosterId={myRosterId} />,
        },
      ]}
    />
  );
}
