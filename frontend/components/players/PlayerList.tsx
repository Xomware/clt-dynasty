"use client";

import { type ReactNode, useDeferredValue, useMemo, useState } from "react";

import { cleanQuery, naturalDesc, type SortKey, type View } from "@/lib/players/params";
import { filterRows, type PlayerRow, sortRows } from "@/lib/players/rows";
import { type MoveKind, moveCount, type Scenario } from "@/lib/players/simulate";
import type { PlayerBoard } from "@/lib/players/use-player-board";
import type { Worth } from "@/lib/players/worth";
import { searchPlayers } from "@/lib/search/nfl";
import { PlayerFilters } from "./PlayerFilters";
import { PlayerResults } from "./PlayerResults";

const PAGE = 50;

interface PlayerListProps {
  board: PlayerBoard;
  view: View;
  onView: (patch: Partial<View>) => void;
  query: string;
  onQuery: (q: string) => void;
  worth: ((id: string) => Worth | null) | null;
  taxi: ((id: string) => ReactNode) | null;
  scenario: Scenario;
  onToggle: (kind: MoveKind, id: string) => void;
  onSimulate: () => void;
}

export function PlayerList({ board, view, onView, query, onQuery, worth, taxi, scenario, onToggle, onSimulate }: PlayerListProps) {
  const [shown, setShown] = useState(PAGE);
  const deferredQuery = useDeferredValue(query);
  const { rows, players, myRosterId, teamFor, rosters } = board;

  const change = (patch: Partial<View>) => {
    onView(patch);
    setShown(PAGE);
  };
  const onSort = (sort: SortKey) => change({ sort, desc: sort === view.sort ? !view.desc : naturalDesc(sort) });

  const matches = useMemo(() => {
    const q = cleanQuery(deferredQuery).trim();
    return q && players ? new Set(searchPlayers(players, q, 2000).map((h) => h.item.player_id)) : null;
  }, [deferredQuery, players]);
  const found = useMemo(() => {
    if (!rows) return null;
    const kept = filterRows(rows, view, myRosterId, matches).filter((r) => !view.worth || !worth || (r.owner === null && worth(r.id)?.verdict !== "none"));
    return sortRows(kept, view.sort, view.desc);
  }, [rows, view, myRosterId, matches, worth]);
  const teams = useMemo(
    () => (rosters ?? []).map((r) => ({ rosterId: r.roster_id, team: teamFor(r.roster_id) })).sort((a, b) => a.team.name.localeCompare(b.team.name)),
    [rosters, teamFor],
  );

  // Free agents go in as adds, my own players as drops; the simulator takes it from there.
  const action =
    myRosterId === null
      ? null
      : (r: PlayerRow) => {
          const kind = r.owner === null ? "adds" : r.owner === myRosterId ? "drops" : null;
          if (!kind) return null;
          const on = scenario[kind].includes(r.id);
          const verb = kind === "adds" ? "Add" : "Drop";
          return (
            <button type="button" className="pl-act" data-kind={kind} aria-pressed={on} aria-label={`${verb} ${r.name}`} onClick={() => onToggle(kind, r.id)}>
              {on ? (kind === "adds" ? "Added" : "Dropped") : verb}
            </button>
          );
        };
  const moves = moveCount(scenario);

  return (
    <div className="pl-list">
      <PlayerFilters
        view={view}
        onChange={change}
        query={query}
        onQuery={(q) => {
          onQuery(q);
          setShown(PAGE);
        }}
        teams={teams}
        mine={myRosterId}
        inSeason={board.week !== null}
        canRate={worth !== null}
      />
      {moves > 0 && (
        <p className="pl-scenario-bar">
          <span>
            Your scenario: {scenario.adds.length} {scenario.adds.length === 1 ? "add" : "adds"}, {scenario.drops.length}{" "}
            {scenario.drops.length === 1 ? "drop" : "drops"}
            {scenario.ir.length > 0 && `, ${scenario.ir.length} to IR`}
            {scenario.send.length + scenario.receive.length > 0 && `, a ${scenario.send.length}-for-${scenario.receive.length} trade`}.
          </span>
          <button type="button" className="xp-button" onClick={onSimulate}>
            Open the simulator
          </button>
        </p>
      )}
      {!found ? (
        <p role="status">Loading every player, his CLT team and this season&rsquo;s numbers...</p>
      ) : (
        <>
          <p className="pl-count" aria-live="polite">
            {found.length === 0
              ? "No players match these filters."
              : `${found.length.toLocaleString("en-US")} ${found.length === 1 ? "player" : "players"}${found.length > shown ? `, showing the first ${shown}` : ""}`}
            {board.rosLoading && " Loading the rest-of-season projections..."}
          </p>
          <Notes missing={board.missing} />
          {found.length > 0 && (
            <PlayerResults
              rows={found.slice(0, shown)}
              sort={view.sort}
              desc={view.desc}
              onSort={onSort}
              mine={myRosterId}
              teamFor={teamFor}
              week={board.week}
              showRos={view.sort === "ros"}
              worth={worth}
              action={action}
              taxi={taxi}
            />
          )}
          {found.length > shown && (
            <button type="button" className="xp-button pl-more" onClick={() => setShown((n) => n + PAGE)}>
              Show {Math.min(PAGE, found.length - shown)} more
            </button>
          )}
        </>
      )}
      <p className="pl-note">
        Points are this season&rsquo;s, scored with CLT&rsquo;s settings (TE premium included). Projections are
        Sleeper&rsquo;s; dynasty values are FantasyCalc&rsquo;s superflex values.
      </p>
    </div>
  );
}

function Notes({ missing }: { missing: PlayerBoard["missing"] }) {
  const gone = [missing.stats && "season stats", missing.proj && "this week's projections", missing.values && "dynasty values", missing.ros && "rest-of-season projections"].filter(Boolean);
  if (gone.length === 0) return null;
  return <p className="pl-warn">Couldn&rsquo;t load {gone.join(", ")}, so those columns are empty. Reopen Players to try again.</p>;
}
