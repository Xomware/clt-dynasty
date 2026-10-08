"use client";

import { PlayerLink } from "@/components/xp/PlayerLink";
import { playerName } from "@/lib/api/players";
import { decode, encode } from "@/lib/players/params";
import { useSavedScenarios } from "@/lib/players/scenarios";
import { isEmpty, readScenario, type Scenario, type SimFor, writeScenario } from "@/lib/players/simulate";
import type { PlayerBoard } from "@/lib/players/use-player-board";

const pts = (n: number) => n.toFixed(1);
const int = (n: number) => Math.round(n).toLocaleString("en-US");
const signed = (n: number, f: (n: number) => string) => (n > 0 ? `+${f(n)}` : n < 0 ? `-${f(-n)}` : "0");

interface ScenarioCompareProps {
  board: PlayerBoard;
  simFor: SimFor;
  current: Scenario;
  onLoad: (s: Scenario) => void;
}

// Saved scenarios side by side, each re-run against today's rosters and
// projections, with the one being edited first.
export function ScenarioCompare({ board, simFor, current, onLoad }: ScenarioCompareProps) {
  const saved = useSavedScenarios();
  if (!simFor) return <p role="status">Loading your roster and this week&rsquo;s projections...</p>;
  const name = (id: string) => playerName(board.players?.[id], id);
  const cards = [
    ...(isEmpty(current) || saved.list.some((s) => s.v === encode(writeScenario(current))) ? [] : [{ id: "current", name: "Unsaved (in the simulator)", scenario: current }]),
    ...saved.list.map((s) => ({ id: s.id, name: s.name, scenario: readScenario(decode(s.v)) })),
  ];

  if (cards.length === 0) {
    return <p>Nothing saved yet. Build a scenario in the Simulator and save it to compare it here.</p>;
  }

  return (
    <ul className="sim-compare" aria-label="Scenarios">
      {cards.map((c) => {
        const sim = simFor(c.scenario);
        if (!sim) return null;
        const lineup = Math.round((sim.mine.afterPoints - sim.mine.beforePoints) * 10) / 10;
        const value = sim.mine.valueAfter - sim.mine.valueBefore;
        const moves = [
          ...c.scenario.adds.map((id) => ({ kind: "adds", verb: "Add", id })),
          ...c.scenario.drops.map((id) => ({ kind: "drops", verb: "Drop", id })),
          ...c.scenario.ir.map((id) => ({ kind: "ir", verb: "IR", id })),
        ];
        return (
          <li key={c.id} className="sim-card" data-current={c.id === "current" || undefined}>
            <h3 className="sim-title">{c.name}</h3>
            <dl className="sim-card-stats">
              <div>
                <dt>{board.week === null ? "Lineup" : `Week ${board.week} lineup`}</dt>
                <dd className="sim-delta" data-sign={Math.sign(lineup)}>
                  {signed(lineup, pts)}
                </dd>
              </div>
              <div>
                <dt>Dynasty value</dt>
                <dd className="sim-delta" data-sign={Math.sign(value)}>
                  {signed(value, int)}
                </dd>
              </div>
              <div>
                <dt>Roster</dt>
                <dd>{sim.problems.length === 0 ? "Legal" : `${sim.problems.length} ${sim.problems.length === 1 ? "problem" : "problems"}`}</dd>
              </div>
            </dl>
            <ul className="sim-card-moves">
              {moves.map((m) => (
                <li key={`${m.verb}:${m.id}`} data-kind={m.kind}>
                  <span className="sim-move-verb">{m.verb}</span> <PlayerLink id={m.id}>{name(m.id)}</PlayerLink>
                </li>
              ))}
            </ul>
            {c.id !== "current" && (
              <div className="sim-card-acts">
                <button type="button" className="xp-button" aria-label={`Open ${c.name} in the simulator`} onClick={() => onLoad(c.scenario)}>
                  Open in the simulator
                </button>
                <button type="button" className="xp-button" aria-label={`Delete ${c.name}`} onClick={() => saved.remove(c.id)}>
                  Delete
                </button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
