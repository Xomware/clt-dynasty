"use client";

import { useId } from "react";

import { DrillLink } from "@/components/xp/DrillLink";
import { LoadError } from "@/components/xp/LoadError";
import { PlayerLink } from "@/components/xp/PlayerLink";
import { usePlayerBoard } from "@/lib/players/use-player-board";
import { useTaxiMarket } from "@/lib/taxi/use-taxi-market";
import { ordinal } from "@/lib/team/team";

const RISK_TEXT = { requested: "Requested", high: "High risk", medium: "Watch" } as const;

// Your week's taxi to-do: my players someone would steal, and the steals worth making.
export function TaxiSteals({ rosterId }: { rosterId: number | null }) {
  const id = useId();
  const board = usePlayerBoard(false);
  const { market, error, retry } = useTaxiMarket(board);
  const { teamFor } = board;
  const names = new Map(market?.entries.map((e) => [e.player.id, e.row.name]));
  // Until the member's team is known, "none at risk" would be a guess.
  const ready = market && rosterId !== null && board.myRosterId === rosterId;

  return (
    <section className="yw-sec yw-taxi" aria-labelledby={id}>
      <h4 id={id} className="yw-title">
        Taxi steals
      </h4>
      {error && <LoadError what="taxi squads" message={error} onRetry={retry} />}
      {!error && !ready && <p role="status">Pricing taxi squads...</p>}
      {ready && (
        <>
          {market.risks.length === 0 ? (
            <p className="yw-ok">None of your taxi players is worth his steal price.</p>
          ) : (
            <ul className="yw-list" aria-label="At risk on your taxi">
              {market.risks.slice(0, 3).map((r) => (
                <li key={r.player.id} className="yw-item" data-kind={r.risk === "medium" ? "risk" : "warn"}>
                  <span className="yw-slot">
                    {RISK_TEXT[r.risk]}
                  </span>
                  <span className="yw-line">
                    <PlayerLink id={r.player.id} className="yw-player">
                      {names.get(r.player.id) ?? r.player.id}
                    </PlayerLink>
                    <span className="yw-why"> {r.reason}. Promote him before Thursday 12pm ET to keep him.</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
          {market.targets.length === 0 ? (
            <p className="yw-ok">No taxi player is clearly worth more than his price to you.</p>
          ) : (
            <ul className="yw-list" aria-label="Steal targets">
              {market.targets.slice(0, 3).map((e) => (
                <li key={e.player.id} className="yw-item" data-kind="steal">
                  <span className="yw-slot">{e.row.position}</span>
                  <span className="yw-line">
                    <PlayerLink id={e.player.id} className="yw-player">
                      {e.row.name}
                    </PlayerLink>
                    <span className="yw-why">
                      {" "}
                      from {teamFor(e.player.rosterId).name} for {e.payment?.picks.map((p) => `${p.season} ${ordinal(p.round)}`).join(" + ")}, worth{" "}
                      {e.assessment.ratio.toFixed(1)}x the picks
                      {e.request && `. Already requested by ${e.request.isMine ? "you" : e.request.requestedBy || "a former member"}`}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
          <span className="yw-taxi-links">
            <DrillLink to={{ kind: "taxi", params: { tab: "risk" } }} className="home-more">
              Your taxi squad&rsquo;s risk
            </DrillLink>
            <DrillLink to={{ kind: "taxi", params: { tab: "targets" } }} className="home-more">
              All steal targets
            </DrillLink>
          </span>
        </>
      )}
    </section>
  );
}
