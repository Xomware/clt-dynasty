"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";

import { Tabs } from "@/components/xp/Tabs";
import { TeamLink } from "@/components/xp/TeamLink";
import type { WindowParams } from "@/lib/desktop/windows";
import { finishOrder, fromSleeper, lastFinishedWeek } from "@/lib/league/brackets";
import { leagueMatchups, tradedPicks, winnersBracket } from "@/lib/league/cache";
import { type DraftSlot, draftOrder, seasonHpp } from "@/lib/league/draft-order";
import { usePlayers } from "@/lib/league/players";
import { playoffSeeds, type Standing, sortStandings } from "@/lib/league/standings";
import { type Team, useLeague } from "@/lib/league/use-league";
import { startingSlots } from "@/lib/league/use-week-games";
import type { SleeperBracketMatch, SleeperMatchup, SleeperTradedPick } from "@/lib/sleeper/types";

import "./league.css";

interface Extra {
  bracket: SleeperBracketMatch[];
  traded: SleeperTradedPick[];
  // Every finished regular-season week, for HPP.
  weeks: SleeperMatchup[][];
}

interface OrderTableProps {
  label: string;
  order: DraftSlot[];
  standings: Standing[];
  hpp?: Map<number, number>;
  heldBy: Map<number, number>;
  teamFor: (rosterId: number) => Team;
  myRosterId: number | null;
}

function OrderTable({ label, order, standings, hpp, heldBy, teamFor, myRosterId }: OrderTableProps) {
  const row = (id: number) => standings.find((s) => s.rosterId === id);
  return (
    <div className="xp-table-scroll">
      <table className="xp-table xp-stack">
        <caption className="sr-only">{label}</caption>
        <thead>
          <tr>
            <th scope="col" className="w-10" aria-label="Pick">
              #
            </th>
            <th scope="col">Team</th>
            <th scope="col" className="w-16">
              W-L
            </th>
            <th scope="col" className="standings-extra w-20 text-right">
              PF
            </th>
            {hpp && (
              <th scope="col" className="w-20 text-right">
                HPP
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {order.map((d, i) => {
            const s = row(d.rosterId);
            const holder = heldBy.get(d.rosterId);
            return (
              <tr key={d.rosterId} className={d.playoff && !order[i - 1]?.playoff ? "xp-group-start" : undefined}>
                <td className="stack-lead tabular-nums">{d.pick}</td>
                <td className="stack-main md:max-w-0">
                  <TeamLink rosterId={d.rosterId} {...teamFor(d.rosterId)} isMine={d.rosterId === myRosterId} />
                  {d.playoff && <span className="xp-tag mt-1 block w-fit">Playoffs</span>}
                  {holder !== undefined && (
                    <span className="block text-xs">1st-round pick held by {teamFor(holder).name}</span>
                  )}
                </td>
                <td className="tabular-nums" data-label="W-L">{s ? `${s.wins}-${s.losses}${s.ties ? `-${s.ties}` : ""}` : ""}</td>
                <td className="standings-extra text-right tabular-nums" data-label="PF">{s?.pf.toFixed(2)}</td>
                {hpp && <td className="text-right tabular-nums" data-label="HPP">{(hpp.get(d.rosterId) ?? 0).toFixed(2)}</td>}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Proposal({ hpp, table }: { hpp: Map<number, number> | null; table: (hpp: Map<number, number>) => ReactNode }) {
  const players = usePlayers();
  return (
    <div className="grid grid-cols-1 gap-3">
      <div className="xp-note grid gap-1">
        <p>
          <strong>Proposal #57, not in effect.</strong> Non-playoff teams pick by season Highest Possible Points: the most
          each roster could have scored with its best lineup every week. Lowest HPP picks first, so leaving points on the
          bench, or tanking, doesn&rsquo;t earn a better pick. Playoff teams stay at the back by finish.
        </p>
      </div>
      {players.status === "error" ? (
        <p role="alert">Couldn&rsquo;t load player positions for HPP ({players.message}).</p>
      ) : !hpp ? (
        <p role="status">Working out every lineup...</p>
      ) : hpp.size === 0 ? (
        <p>No regular-season week has finished yet, so there is no HPP to rank by.</p>
      ) : (
        table(hpp)
      )}
    </div>
  );
}

export function DraftOrderWindow({ params }: { params: WindowParams }) {
  const { data, error: leagueError, teamFor, myRosterId } = useLeague();
  const players = usePlayers();
  const [extra, setExtra] = useState<Extra | null>(null);
  const [error, setError] = useState<string | null>(null);

  const finished = data ? Math.min(lastFinishedWeek(data.nfl, data.league.season), data.league.settings.playoff_week_start - 1) : 0;
  const inSeason = data?.league.status === "in_season";
  useEffect(() => {
    if (!data) return;
    let live = true;
    const weeks = Array.from({ length: Math.max(0, finished) }, (_, i) => leagueMatchups(i + 1, false));
    Promise.all([winnersBracket(inSeason), tradedPicks(), Promise.all(weeks)])
      .then(([bracket, traded, rows]) => live && setExtra({ bracket, traded, weeks: rows }))
      .catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [data, finished, inSeason]);

  const view = useMemo(() => {
    if (!data || !extra) return null;
    const standings = sortStandings(data.rosters);
    const seeds = playoffSeeds(standings);
    const finish = finishOrder(fromSleeper(extra.bracket, seeds), seeds);
    const next = String(Number(data.league.season) + 1);
    const heldBy = new Map(
      extra.traded.filter((t) => t.season === next && t.round === 1 && t.owner_id !== t.roster_id).map((t) => [t.roster_id, t.owner_id]),
    );
    return { standings, seeds, finish, next, heldBy };
  }, [data, extra]);

  const hpp = useMemo(() => {
    if (!data || !extra || players.status !== "ok") return null;
    const positionOf = (id: string) => players.players[id]?.position;
    return seasonHpp(extra.weeks, startingSlots(data.league.roster_positions), positionOf);
  }, [data, extra, players]);

  const failed = leagueError ?? error;
  if (failed) return <p role="alert">Couldn&rsquo;t reach Sleeper ({failed}). Close Draft Order and open it again to retry.</p>;
  if (!data || !view) return <p role="status">Loading the standings...</p>;
  if (view.standings.length === 0) return <p>No teams in the league yet.</p>;

  const playoffTeams = data.league.settings.playoff_teams;
  const table = (label: string, h?: Map<number, number>) => (
    <OrderTable
      label={label}
      order={draftOrder(view.standings, view.seeds, playoffTeams, view.finish, h)}
      standings={view.standings}
      hpp={h}
      heldBy={view.heldBy}
      teamFor={teamFor}
      myRosterId={myRosterId}
    />
  );

  return (
    <div className="grid grid-cols-1 gap-2">
      <p>
        {view.finish
          ? `The ${view.next} rookie draft order, from the final ${data.league.season} results.`
          : `Projected ${view.next} rookie draft order from today's standings. Playoff teams sit by seed until the final.`}
      </p>
      <Tabs
        label="Draft order rule"
        selected={params.tab}
        tabs={[
          { id: "record", label: "Rulebook", panel: () => table(`${view.next} draft order by the rulebook`) },
          {
            id: "hpp",
            label: "Proposal #57",
            panel: () => <Proposal hpp={hpp} table={(h) => table(`${view.next} draft order under proposal 57`, h)} />,
          },
        ]}
      />
    </div>
  );
}
