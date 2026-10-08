import { describe, expect, it } from "vitest";

import { fixture } from "@/lib/test/league-mock";
import { ROSTER_4, SLOTS, value, week } from "@/lib/test/players-fixture";
import type { SleeperRoster } from "@/lib/sleeper/types";
import { EMPTY_SCENARIO, limitsOf, readScenario, type Scenario, simulate, writeScenario } from "./simulate";

// Roster 9 has a QB, an RB and a WR the free agents can be measured against.
const ROSTER_9: SleeperRoster = { ...ROSTER_4, roster_id: 9, owner_id: "u9", starters: [], players: ["r9qb", "r9rb", "r9wr"], taxi: [], reserve: [] };
const ROSTERS = [ROSTER_4, ROSTER_9];
const LIMITS = { active: 12, taxi: 4, ir: 2, irStatuses: ["IR"] };
const INJURY: Record<string, string> = { bnWr: "IR", bnRb: "Questionable" };

const run = (scenario: Partial<Scenario>, limits = LIMITS) =>
  simulate({ scenario: { ...EMPTY_SCENARIO, ...scenario }, rosterId: 4, rosters: ROSTERS, slots: SLOTS, limits, week, value, injury: (id) => INJURY[id] ?? null });

describe("add/drop simulator", () => {
  it("re-solves the best lineup with two adds and a drop, and says which slots change", () => {
    const sim = run({ adds: ["faWr", "faRb2"], drops: ["bnRb"] })!;
    expect(sim.problems).toEqual([]);
    expect(sim.mine.beforePoints).toBe(113.1);
    // The 12.1 WR takes WR2; the old WR2 slides to FLEX, which pushes everyone down to SUPER_FLEX.
    expect(sim.mine.afterPoints).toBe(117.3);
    expect(sim.mine.changed.map((i) => SLOTS[i])).toEqual(["WR", "FLEX", "FLEX", "SUPER_FLEX"]);
    expect(sim.mine.after[4]).toBe("faWr");
    expect(sim.mine.valueAfter - sim.mine.valueBefore).toBe(500 + 1500 - 300);
    expect(sim.mine.counts).toEqual({ active: 12, taxi: 1, ir: 1 });
  });

  it("counts depth by position, IR apart, against the league average", () => {
    const rb = run({ adds: ["faRb2"], drops: ["bnRb"] })!.depth.find((d) => d.position === "RB")!;
    expect(rb.before).toEqual({ count: 5, value: 11800 });
    expect(rb.after).toEqual({ count: 5, value: 13000 });
    // Roster 9's one RB pulls the average to 3 players.
    expect(rb.league).toEqual({ count: 3, value: 6400 });
  });

  it("never lets the active roster or IR run over the league's limits", () => {
    expect(run({ adds: ["faWr", "faRb2"] })!.problems).toEqual([{ kind: "over", spot: "active", by: 1 }]);
    // Moving an IR-designated player to IR opens the spot.
    const sim = run({ adds: ["faWr", "faRb2"], ir: ["bnWr"] })!;
    expect(sim.problems).toEqual([]);
    expect(sim.mine.counts).toEqual({ active: 12, taxi: 1, ir: 2 });
    expect(run({ ir: ["bnWr"] }, { ...LIMITS, ir: 1 })!.problems).toEqual([{ kind: "over", spot: "ir", by: 1 }]);
  });

  it("flags moves Sleeper would refuse", () => {
    const sim = run({ adds: ["wr1", "faLate"], drops: ["qb1", "r9qb"], ir: ["bnRb"] })!;
    expect(sim.problems).toEqual([
      { kind: "rostered", id: "wr1" },
      { kind: "locked", id: "faLate" },
      { kind: "locked", id: "qb1" },
      { kind: "not-mine", id: "r9qb" },
      { kind: "not-ir-eligible", id: "bnRb" },
    ]);
  });

  it("reads CLT's limits from the league: 26 active, 4 taxi, 8 IR taking DNR and COV", () => {
    expect(limitsOf({ ...fixture.league, settings: { ...fixture.league.settings, taxi_slots: 4, reserve_slots: 8, reserve_allow_dnr: 1, reserve_allow_cov: 1, reserve_allow_out: 0 } })).toEqual({
      active: 26,
      taxi: 4,
      ir: 8,
      irStatuses: ["IR", "DNR", "COV"],
    });
  });

  it("round-trips a scenario through the page link, next to the filters", () => {
    const fields = writeScenario({ adds: ["123", "456"], drops: ["789"], ir: [] }, new Map([["pos", "RB"]]));
    expect([...fields]).toEqual([["pos", "RB"], ["add", "123.456"], ["drop", "789"]]);
    expect(readScenario(new Map([["add", "123.x.123"], ["ir", "9"]]))).toEqual({ adds: ["123"], drops: [], ir: ["9"] });
  });
});
