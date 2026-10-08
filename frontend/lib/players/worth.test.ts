import { describe, expect, it } from "vitest";

import { facts, ROSTER_4, SLOTS, value, week } from "@/lib/test/players-fixture";
import { eliteValue, worthFor } from "./worth";

const worth = worthFor({ slots: SLOTS, roster: ROSTER_4, week, value, facts, elite: 6500 });

describe("worth adding a free agent", () => {
  it("calls a free agent who'd crack the best lineup a starter upgrade, with the points he adds", () => {
    // 12.1 beats the 12.0 WR2 for a WR slot; the lineup's weakest, the 7.9 superflex RB, sits.
    expect(worth("faWr")).toMatchObject({ verdict: "starter", gain: 4.2, slot: "WR", position: "WR" });
  });

  it("calls him depth when he beats the weakest bench player at his position by the waiver margin", () => {
    // 6.0 and 1500 against the 4.0, 300 bench RB.
    expect(worth("faRb2")).toMatchObject({ verdict: "depth", gain: 0 });
    // Same points, 200 value: not enough over the bench RB to bother.
    expect(worth("faRb").verdict).toBe("none");
  });

  it("stashes only a young player who out-values the lowest-valued player at his position", () => {
    // The yardstick is the IR tight end, the lowest-valued TE on the roster.
    expect(worth("faTe")).toMatchObject({ verdict: "stash", floor: { id: "irTe", value: 1000 }, valueDelta: 2000 });
    // The same value at 31 is no stash, and a rookie FantasyCalc barely lists isn't one either.
    expect(worth("faVet").verdict).toBe("none");
    expect(worth("faRook").verdict).toBe("none");
  });

  it("never starts a player whose game has kicked off, or one no slot takes", () => {
    expect(worth("faLate")).toMatchObject({ verdict: "depth", gain: 0, slot: null });
    expect(worth("faK")).toMatchObject({ verdict: "none", gain: 0 });
  });
});

describe("another team's player", () => {
  it("calls a top-24 dynasty value a cornerstone, never a stash, even though he'd start", () => {
    expect(worth("r7star")).toMatchObject({ verdict: "cornerstone", slot: "SUPER_FLEX", age: 31 });
  });

  it("calls an aging producer a rental and an aging non-producer not a fit", () => {
    // 12.0 takes an RB slot; the lineup's weakest, the 7.9 superflex RB, sits.
    expect(worth("r7vet")).toMatchObject({ verdict: "rental", slot: "RB", gain: 4.1, age: 30 });
    expect(worth("r7old").verdict).toBe("nofit");
  });

  it("calls a player who'd start, or out-value a starter at his position, a trade target", () => {
    // 15.0 over the 7.9 superflex RB.
    expect(worth("r9qb")).toMatchObject({ verdict: "target", slot: "SUPER_FLEX", gain: 7.1 });
    // 3.0 points start nowhere, but 3500 beats the 1200 WR in the FLEX.
    expect(worth("r7young")).toMatchObject({ verdict: "target", slot: null, floor: { id: "fx1", value: 1200 }, valueDelta: 2300 });
    // 8.0 is 0.1 over the superflex RB, and 1000 doesn't clear the 900 RB starter by the margin.
    expect(worth("r9rb").verdict).toBe("nofit");
  });
});

describe("eliteValue", () => {
  it("is the 24th-highest value, or out of reach in a list shorter than that", () => {
    expect(eliteValue(Array.from({ length: 30 }, (_, i) => (i + 1) * 100))).toBe(700);
    expect(eliteValue([9000, 8000])).toBe(Infinity);
  });
});
