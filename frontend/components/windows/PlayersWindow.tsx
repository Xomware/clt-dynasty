"use client";

import { useContext, useEffect, useMemo, useState } from "react";

import { PlayerList } from "@/components/players/PlayerList";
import { ScenarioCompare } from "@/components/players/ScenarioCompare";
import { Simulator } from "@/components/players/Simulator";
import { taxiBadges } from "@/components/taxi/TaxiBadge";
import { LoadError } from "@/components/xp/LoadError";
import { Tabs } from "@/components/xp/Tabs";
import { valueOf } from "@/lib/analyzer/values";
import type { WindowParams } from "@/lib/desktop/windows";
import type { PlayerWeek } from "@/lib/home/projections";
import { cleanQuery, decode, encode, readView, type View, writeView } from "@/lib/players/params";
import { limitsOf, MOVE_KINDS, type MoveKind, moveCount, readScenario, type Scenario, type SimFor, simulate, writeScenario } from "@/lib/players/simulate";
import { type PlayerBoard, usePlayerBoard } from "@/lib/players/use-player-board";
import { eliteValue, type PlayerFacts, type Worth, worthFor } from "@/lib/players/worth";
import { useTaxiMarket } from "@/lib/taxi/use-taxi-market";
import { ViewParamsContext } from "@/lib/view-params";

import "./players-page.css";
import "./taxi.css";
import "./settings.css";

export function PlayersWindow({ params }: { params: WindowParams }) {
  const setParams = useContext(ViewParamsContext);
  const [view, setView] = useState<View>(() => readView(decode(String(params.v ?? ""))));
  const [query, setQuery] = useState(view.q);
  const [scenario, setScenario] = useState<Scenario>(() => readScenario(decode(String(params.v ?? ""))));
  const board = usePlayerBoard(view.sort === "ros");

  // The filters and the scenario live in the window's link, so Back from a
  // player and a shared link both restore them.
  const v = encode(writeScenario(scenario, writeView({ ...view, q: cleanQuery(query) }, decode(String(params.v ?? "")))));
  useEffect(() => {
    if (setParams && v !== String(params.v ?? "")) setParams({ v });
  }, [v, params.v, setParams]);

  const worth = useWorth(board);
  const { market } = useTaxiMarket(board);
  const taxi = useMemo(() => (market ? taxiBadges(market, board.myRosterId) : null), [market, board.myRosterId]);
  const simFor = useSimulation(board);

  // A player is in the scenario once: adding a dropped player undoes the drop.
  const toggle = (kind: MoveKind, id: string) =>
    setScenario((s) => {
      const on = s[kind].includes(id);
      const rest = { ...s };
      for (const k of MOVE_KINDS) rest[k] = s[k].filter((x) => x !== id);
      return on ? rest : { ...rest, [kind]: [...rest[kind], id] };
    });

  if (board.error) return <LoadError what="players and rosters" message={board.error} onRetry={board.retry} />;

  const moves = moveCount(scenario);
  const pick = (tab: string) => setParams?.({ tab });
  return (
    <div className="pl">
      <Tabs
        label="Players views"
        selected={params.tab}
        tabs={[
          {
            id: "list",
            label: "Players",
            panel: () => (
              <PlayerList
                board={board}
                view={view}
                onView={(patch) => setView((old) => ({ ...old, ...patch }))}
                query={query}
                onQuery={setQuery}
                worth={worth}
                taxi={taxi}
                scenario={scenario}
                onToggle={toggle}
                onSimulate={() => pick("sim")}
              />
            ),
          },
          {
            id: "sim",
            label: moves ? `Simulator (${moves})` : "Simulator",
            panel: () => <Simulator board={board} scenario={scenario} onScenario={setScenario} onToggle={toggle} worth={worth} simFor={simFor} />,
          },
          {
            id: "compare",
            label: "Saved",
            panel: () => <ScenarioCompare board={board} simFor={simFor} current={scenario} onLoad={(s) => {
                  setScenario(s);
                  pick("sim");
                }} />,
          },
        ]}
      />
    </div>
  );
}

// The worth check for every player not on my team, judged once per data
// change. Players with no projection and no value are never worth it.
function useWorth({ rows, rosters, myRosterId, board, slots, values }: PlayerBoard) {
  return useMemo(() => {
    const roster = rosters?.find((r) => r.roster_id === myRosterId);
    if (!rows || !roster || !board || !values) return null;
    const byId = new Map(rows.map((r) => [r.id, r]));
    const facts = (id: string): PlayerFacts => {
      const r = byId.get(id);
      return { age: r?.age ?? null, yearsExp: r?.player.years_exp ?? null, owned: r?.owner != null };
    };
    const elite = eliteValue([...values.players.values()].map((v) => v.value));
    const judge = worthFor({ slots, roster, week: board, value: (id) => valueOf(values, id), facts, elite });
    const verdicts = new Map<string, Worth>();
    for (const r of rows) {
      if (r.owner === myRosterId) continue;
      const none: Worth = { verdict: r.owner === null ? "none" : "nofit", position: r.position, gain: 0, slot: null, floor: null, valueDelta: 0, age: r.age, points: 0 };
      verdicts.set(r.id, (r.proj ?? 0) > 0 || r.value > 0 ? judge(r.id) : none);
    }
    return (id: string) => verdicts.get(id) ?? null;
  }, [rows, rosters, myRosterId, board, slots, values]);
}

// Runs any scenario against my team. Out of season every projection is 0, so
// only the roster count and dynasty value move.
function useSimulation({ data, rosters, myRosterId, board, slots, values, players }: PlayerBoard): SimFor {
  return useMemo(() => {
    if (!data || !rosters || myRosterId === null || !players) return null;
    const limits = limitsOf(data.league);
    const idle = (id: string): PlayerWeek => {
      const position = players[id]?.position ?? "";
      return { points: 0, position, positions: [position], team: players[id]?.team ?? null, injury: players[id]?.injury_status ?? null, bye: false, locked: false };
    };
    const week = board ?? idle;
    const value = (id: string) => (values ? valueOf(values, id) : 0);
    return (scenario: Scenario) =>
      simulate({ scenario, rosterId: myRosterId, rosters, slots, limits, week, value, injury: (id) => week(id).injury ?? players[id]?.injury_status ?? null });
  }, [data, rosters, myRosterId, board, slots, values, players]);
}
