"use client";

import { useMemo, useState } from "react";

import { pastDrafts } from "@/components/windows/DraftHistoryWindow";
import { listTaxiRequests, type TaxiRequest } from "@/lib/api/taxi";
import { tradedPicks } from "@/lib/league/cache";
import type { PlayerRow } from "@/lib/players/rows";
import { usePlayerBoard } from "@/lib/players/use-player-board";
import { useLoad } from "@/lib/use-load";
import {
  type Assessment,
  assess,
  type Cost,
  draftSpots,
  type DraftSpot,
  listPrice,
  ownedPicks,
  type Payment,
  paySeasons,
  payWith,
  stealCost,
  type TaxiPlayer,
} from "./market";

export interface TaxiEntry {
  player: TaxiPlayer;
  row: PlayerRow;
  spot: DraftSpot | null;
  cost: Cost;
  // Against the rounds owed from the next draft; null without FantasyCalc.
  assessment: Assessment | null;
  // What I'd hand over for another team's player, and the verdict at that price.
  payment: Payment | null;
  mine: Assessment | null;
  rank: number | null;
  trend: number | null;
  request: TaxiRequest | undefined;
}

// "WR2 on HOU": Sleeper's depth chart order at his position.
function depthOf(row: PlayerRow): string | null {
  const order = row.player.depth_chart_order;
  return order && row.team ? `${row.position}${order} on ${row.team}` : null;
}

// Every taxi player with his steal price, his case and any request on him.
// Prices need the drafts and traded picks; values need FantasyCalc and fill
// in when it answers.
export function useTaxiMarket() {
  const board = usePlayerBoard(false);
  const { rows, rosters, values, data, myRosterId } = board;
  const past = pastDrafts.use();
  const [traded, retryTraded] = useLoad(() => tradedPicks(), "traded");
  const [requestLoad, retryRequests] = useLoad(listTaxiRequests, "taxi-requests");
  // Requests made here, ahead of the next list.
  const [made, setMade] = useState<TaxiRequest[]>([]);
  const requests = useMemo(() => (requestLoad.status === "ok" ? [...made, ...requestLoad.value] : made), [requestLoad, made]);

  const market = useMemo(() => {
    if (!rows || !rosters || !data || past.status !== "ok" || traded.status !== "ok") return null;
    const byId = new Map(rows.map((r) => [r.id, r]));
    const spots = draftSpots(past.drafts);
    const season = data.league.season;
    const seasons = paySeasons(season, past.drafts.some((d) => d.draft.season === season));
    const rounds = Number(data.league.settings.draft_rounds ?? 5);
    const rosterIds = rosters.map((r) => r.roster_id);
    const held = myRosterId === null ? null : ownedPicks(myRosterId, seasons, rounds, rosterIds, traded.value);

    const entries: TaxiEntry[] = rosters.flatMap((r) =>
      (r.taxi ?? []).flatMap((id) => {
        const row = byId.get(id);
        if (!row) return [];
        const player: TaxiPlayer = { id, rosterId: r.roster_id, position: row.position, value: row.value, ppg: row.ppg, depth: depthOf(row) };
        const spot = spots.get(id) ?? null;
        const cost = stealCost(spot);
        const fc = values?.players.get(id);
        const assessment = values ? assess(player, listPrice(cost.rounds, seasons[0], values.picks)) : null;
        const payment = values && held && r.roster_id !== myRosterId ? payWith(cost.rounds, held, values.picks) : null;
        const mine = payment && payment.missing.length === 0 ? assess(player, payment.value) : null;
        const request = requests.find((q) => q.playerId === id);
        return [{ player, row, spot, cost, assessment, payment, mine, rank: fc?.rank ?? null, trend: fc?.trend ?? null, request }];
      }),
    );
    return { entries, seasons };
  }, [rows, rosters, data, past, traded, values, myRosterId, requests]);

  const error =
    board.error ??
    (past.status === "error" ? past.message : traded.status === "error" ? traded.message : requestLoad.status === "error" ? requestLoad.message : null);
  const retry = () => {
    board.retry();
    if (past.status === "error") void pastDrafts.refresh();
    retryTraded();
    retryRequests();
  };

  return {
    board,
    market,
    error,
    retry,
    // A request made here shows at once; the backend tells the league.
    added: (r: TaxiRequest) => setMade((m) => [r, ...m]),
  };
}

export type TaxiMarket = ReturnType<typeof useTaxiMarket>;
