import { describe, expect, it } from "vitest";

import { ROSTER_4, SLOTS, value, week } from "@/lib/test/players-fixture";
import { worthFor } from "./worth";

const worth = worthFor({ slots: SLOTS, roster: ROSTER_4, week, value });

describe("worth adding", () => {
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

  it("calls a better dynasty asset than the lowest-valued player at his position a stash", () => {
    // The yardstick is the IR tight end, the lowest-valued TE on the roster.
    expect(worth("faTe")).toMatchObject({ verdict: "stash", floor: { id: "irTe", value: 1000 }, valueDelta: 2000 });
  });

  it("never starts a player whose game has kicked off, or one no slot takes", () => {
    expect(worth("faLate")).toMatchObject({ verdict: "depth", gain: 0, slot: null });
    expect(worth("faK")).toMatchObject({ verdict: "none", gain: 0 });
  });
});
