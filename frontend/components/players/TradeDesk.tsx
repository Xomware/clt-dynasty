"use client";

import { useId, useState } from "react";

import { useTradeIdeas } from "@/lib/home/use-trade-ideas";
import type { PlayerRow } from "@/lib/players/rows";
import type { MoveKind, Scenario } from "@/lib/players/simulate";
import type { PlayerBoard } from "@/lib/players/use-player-board";
import { Who } from "./PlayerResults";

const pts = (n: number) => n.toFixed(1);
const int = (n: number) => Math.round(n).toLocaleString("en-US");
const SHOWN = 10;

interface TradeDeskProps {
  board: PlayerBoard;
  byId: Map<string, PlayerRow>;
  scenario: Scenario;
  onScenario: (s: Scenario) => void;
  onToggle: (kind: MoveKind, id: string) => void;
}

// A trade with one other CLT team: pick the partner, then who you get from
// them; who you send is picked on your roster. The Team Analyzer's own
// suggestions load in one tap.
export function TradeDesk({ board, byId, scenario, onScenario, onToggle }: TradeDeskProps) {
  const id = useId();
  const [all, setAll] = useState(false);
  const { rosters, myRosterId, teamFor } = board;
  const ideas = useTradeIdeas(myRosterId);
  const partners = (rosters ?? []).filter((r) => r.roster_id !== myRosterId).sort((a, b) => teamFor(a.roster_id).name.localeCompare(teamFor(b.roster_id).name));
  const them = partners.find((r) => r.roster_id === scenario.partner);
  // Most valuable first; whoever is already picked stays in view.
  const sorted = (them?.players ?? []).flatMap((p) => byId.get(p) ?? []).sort((a, b) => b.value - a.value);
  const theirs = all ? sorted : sorted.filter((r, i) => i < SHOWN || scenario.receive.includes(r.id));
  const suggestions = ideas.state.status === "ok" ? ideas.state.ideas.trades : [];

  return (
    <section className="sim-sec sim-trade" aria-labelledby={`${id}-h`}>
      <h3 id={`${id}-h`} className="sim-title">
        Trade with another team
      </h3>
      <div className="pl-field">
        <label htmlFor={`${id}-partner`}>Trade partner</label>
        <select
          id={`${id}-partner`}
          className="xp-select"
          value={scenario.partner ?? ""}
          onChange={(e) => onScenario({ ...scenario, partner: e.target.value ? Number(e.target.value) : null, receive: [], send: e.target.value ? scenario.send : [] })}
        >
          <option value="">No trade</option>
          {partners.map((r) => (
            <option key={r.roster_id} value={r.roster_id}>
              {teamFor(r.roster_id).name}
            </option>
          ))}
        </select>
      </div>

      {suggestions.length > 0 && (
        <div className="sim-group">
          <h4 className="sim-group-title">Team Analyzer ideas</h4>
          <ul className="sim-ideas">
            {suggestions.map((t) => (
              <li key={`${t.partner.rosterId}:${t.give.id}:${t.receive.id}`}>
                <button
                  type="button"
                  className="xp-button sim-idea"
                  onClick={() => onScenario({ ...scenario, partner: t.partner.rosterId, send: [t.give.id], receive: [t.receive.id] })}
                >
                  Give {t.give.name} for {t.receive.name}
                  <span className="sim-idea-team">with {t.partner.name}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {them ? (
        <div className="sim-group">
          <h4 className="sim-group-title">Get from {teamFor(them.roster_id).name}</h4>
          <ul className="sim-picks">
            {theirs.map((r) => {
              const on = scenario.receive.includes(r.id);
              return (
                <li key={r.id} className="sim-pick">
                  <Who row={r} />
                  <span className="sim-pick-stats">
                    {r.proj !== null && <span>{pts(r.proj)} pts</span>}
                    <span>{int(r.value)} value</span>
                    {r.slot !== "active" && <span>{r.slot === "taxi" ? "Taxi" : "IR"}</span>}
                  </span>
                  <button type="button" className="pl-act" data-kind="receive" aria-pressed={on} aria-label={`Get ${r.name}`} onClick={() => onToggle("receive", r.id)}>
                    {on ? "Getting" : "Get"}
                  </button>
                </li>
              );
            })}
          </ul>
          {theirs.length < sorted.length && (
            <button type="button" className="xp-button pl-more" onClick={() => setAll(true)}>
              Show all {sorted.length}
            </button>
          )}
        </div>
      ) : (
        <p>Pick a partner to send players from your roster and pick who you get back.</p>
      )}
    </section>
  );
}
