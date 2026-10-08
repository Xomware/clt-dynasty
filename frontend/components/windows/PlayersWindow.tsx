"use client";

import { useContext, useDeferredValue, useEffect, useMemo, useState } from "react";

import { PlayerFilters } from "@/components/players/PlayerFilters";
import { PlayerResults } from "@/components/players/PlayerResults";
import { LoadError } from "@/components/xp/LoadError";
import type { WindowParams } from "@/lib/desktop/windows";
import { cleanQuery, decode, encode, naturalDesc, readView, type SortKey, type View, writeView } from "@/lib/players/params";
import { filterRows, sortRows } from "@/lib/players/rows";
import { usePlayerBoard } from "@/lib/players/use-player-board";
import { searchPlayers } from "@/lib/search/nfl";
import { ViewParamsContext } from "@/lib/view-params";

import "./players-page.css";
import "./settings.css";

const PAGE = 50;

export function PlayersWindow({ params }: { params: WindowParams }) {
  const setParams = useContext(ViewParamsContext);
  const [view, setView] = useState<View>(() => readView(decode(String(params.v ?? ""))));
  const [query, setQuery] = useState(view.q);
  const [shown, setShown] = useState(PAGE);
  const board = usePlayerBoard(view.sort === "ros");
  const deferredQuery = useDeferredValue(query);

  // The view lives in the window's link, so Back from a player and a shared link both restore it.
  const v = encode(writeView({ ...view, q: cleanQuery(query) }, decode(String(params.v ?? ""))));
  useEffect(() => {
    if (setParams && v !== String(params.v ?? "")) setParams({ v });
  }, [v, params.v, setParams]);

  const change = (patch: Partial<View>) => {
    setView((old) => ({ ...old, ...patch }));
    setShown(PAGE);
  };
  const onQuery = (q: string) => {
    setQuery(q);
    setShown(PAGE);
  };
  const onSort = (sort: SortKey) => change({ sort, desc: sort === view.sort ? !view.desc : naturalDesc(sort) });

  const { rows, players, myRosterId, teamFor, rosters } = board;
  const matches = useMemo(() => {
    const q = cleanQuery(deferredQuery).trim();
    return q && players ? new Set(searchPlayers(players, q, 2000).map((h) => h.item.player_id)) : null;
  }, [deferredQuery, players]);
  const found = useMemo(() => (rows ? sortRows(filterRows(rows, view, myRosterId, matches), view.sort, view.desc) : null), [rows, view, myRosterId, matches]);
  const teams = useMemo(
    () => (rosters ?? []).map((r) => ({ rosterId: r.roster_id, team: teamFor(r.roster_id) })).sort((a, b) => a.team.name.localeCompare(b.team.name)),
    [rosters, teamFor],
  );

  if (board.error) return <LoadError what="players and rosters" message={board.error} onRetry={board.retry} />;

  return (
    <div className="pl">
      <PlayerFilters
        view={view}
        onChange={change}
        query={query}
        onQuery={onQuery}
        teams={teams}
        mine={myRosterId}
        inSeason={board.week !== null}
      />
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

function Notes({ missing }: { missing: { stats: boolean; proj: boolean; values: boolean; ros: boolean } }) {
  const gone = [missing.stats && "season stats", missing.proj && "this week's projections", missing.values && "dynasty values", missing.ros && "rest-of-season projections"].filter(Boolean);
  if (gone.length === 0) return null;
  return <p className="pl-warn">Couldn&rsquo;t load {gone.join(", ")}, so those columns are empty. Reopen Players to try again.</p>;
}
