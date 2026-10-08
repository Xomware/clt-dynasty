import { describe, expect, it } from "vitest";

import type { SleeperDraft, SleeperDraftPick, SleeperTradedPick } from "@/lib/sleeper/types";
import {
  assess,
  atRisk,
  draftSpots,
  listPrice,
  ownedPicks,
  paySeasons,
  payWith,
  pickValue,
  stealCase,
  stealCost,
  stealTargets,
  type TaxiPlayer,
} from "./market";

// FantasyCalc's real pick values on 2026-10-08 (no 5ths, no 2029 split).
const PICKS = new Map([
  ["2027 1st", 3069],
  ["2027 2nd", 1601],
  ["2027 3rd", 1124],
  ["2027 4th", 852],
  ["2027 1st (Early)", 5044],
  ["2028 1st", 2241],
  ["2028 2nd", 1372],
  ["2028 3rd", 1005],
  ["2028 4th", 803],
]);

describe("steal price, rulebook 3C", () => {
  it("charges the table's rounds by the round he was taken in", () => {
    const at = (round: number) => stealCost({ season: "2026", round, pick: 7 }).rounds;
    expect([1, 2, 3, 4, 5].map(at)).toEqual([[1, 2], [1], [2], [3], [4]]);
    expect(stealCost({ season: "2025", round: 3, pick: 1 }).basis).toBe("Drafted 2025 3.01");
  });

  it("charges a 5th for an undrafted player and a startup pick past the 5th round", () => {
    expect(stealCost(null)).toEqual({ rounds: [5], basis: "Undrafted" });
    expect(stealCost({ season: "2024", round: 20, pick: 11 })).toMatchObject({ rounds: [5], basis: expect.stringMatching(/^Startup pick 2024 20\.11/) });
  });
});

describe("draft spots", () => {
  const draft = (season: string): SleeperDraft => ({ season, settings: { teams: 12 } }) as SleeperDraft;
  const pick = (player_id: string, round: number, pick_no: number) => ({ player_id, round, pick_no }) as SleeperDraftPick;

  it("keeps the newest draft that took him, with the pick within the round", () => {
    const spots = draftSpots([
      { draft: draft("2026"), picks: [pick("a", 3, 31)] },
      { draft: draft("2024"), picks: [pick("a", 20, 239), pick("b", 2, 13)] },
    ]);
    expect(spots.get("a")).toEqual({ season: "2026", round: 3, pick: 7 });
    expect(spots.get("b")).toEqual({ season: "2024", round: 2, pick: 1 });
  });
});

describe("picks a roster holds", () => {
  // Roster 5 sent its 2027 2nd to roster 7 and got roster 3's 2028 4th, as keyed by original roster_id.
  const traded: SleeperTradedPick[] = [
    { season: "2027", round: 2, roster_id: 5, owner_id: 7, previous_owner_id: 5 },
    { season: "2028", round: 4, roster_id: 3, owner_id: 5, previous_owner_id: 3 },
    { season: "2026", round: 1, roster_id: 9, owner_id: 5, previous_owner_id: 9 },
  ];
  const owned = ownedPicks(5, ["2027", "2028"], 5, [3, 5, 7, 9], traded);

  it("pays from the next two drafts once this season's is done", () => {
    expect(paySeasons("2026", true)).toEqual(["2027", "2028"]);
    expect(paySeasons("2026", false)).toEqual(["2026", "2027"]);
  });

  it("lists own picks not traded away plus the ones traded in", () => {
    expect(owned.filter((p) => p.season === "2027").map((p) => p.round)).toEqual([1, 3, 4, 5]);
    expect(owned.filter((p) => p.season === "2028" && p.round === 4)).toEqual([
      { season: "2028", round: 4, original: 3 },
      { season: "2028", round: 4, original: 5 },
    ]);
  });

  it("pays a 2nd with the 2028 one when the 2027 2nd is gone", () => {
    expect(payWith([2], owned, PICKS)).toEqual({ picks: [{ season: "2028", round: 2, original: 5 }], missing: [], value: 1372 });
  });

  it("pays a 1st-rounder's price with a 1st and a 2nd", () => {
    expect(payWith([1, 2], owned, PICKS).picks.map((p) => `${p.season} ${p.round}`)).toEqual(["2027 1", "2028 2"]);
  });

  it("meets the minimum with a better round, or reports the round it can't cover", () => {
    const onlyFirsts = owned.filter((p) => p.round === 1);
    expect(payWith([3], onlyFirsts, PICKS).picks).toEqual([{ season: "2027", round: 1, original: 5 }]);
    expect(payWith([1, 2], onlyFirsts.slice(0, 1), PICKS)).toMatchObject({ missing: [2], value: 3069 });
  });
});

describe("pick values", () => {
  it("reads the season's generic pick, extrapolates a 5th and falls back to the latest season listed", () => {
    expect(pickValue(PICKS, "2027", 2)).toBe(1601);
    // 852 * 852 / 1124
    expect(pickValue(PICKS, "2027", 5)).toBe(646);
    expect(pickValue(PICKS, "2030", 1)).toBe(2241);
    expect(listPrice([1, 2], "2027", PICKS)).toBe(4670);
  });
});

const player = (id: string, rosterId: number, position: string, value: number, ppg: number | null, depth: string | null = null): TaxiPlayer => ({ id, rosterId, position, value, ppg, depth });

describe("value against the price", () => {
  it("adds 50 a point per game to dynasty value and grades the ratio", () => {
    // Pat Bryant: 1418 + 50 * 8.0 against a 3rd.
    expect(assess(player("pb", 9, "WR", 1418, 8), 1124)).toMatchObject({ worth: 1818, verdict: "bargain" });
    expect(assess(player("mw", 8, "RB", 1436, 4.7), 1601)).toMatchObject({ worth: 1671, verdict: "fair" });
    expect(assess(player("cb", 1, "QB", 1343, null), 4670)).toMatchObject({ worth: 1343, verdict: "overpay" });
  });
});

describe("my taxi players at risk", () => {
  const entry = (p: TaxiPlayer, price: number, rounds: number[]) => ({ player: p, assessment: assess(p, price), rounds });
  // Roster 5's real four: Noel (2025 3rd), Allar (2026 3rd), Coleman (4th), Joly (5th).
  const mine = [
    entry(player("noel", 5, "WR", 746, 7.3, "WR3 on HOU"), 1601, [2]),
    entry(player("allar", 5, "QB", 863, null), 1601, [2]),
    entry(player("coleman", 5, "WR", 204, 0.7), 1124, [3]),
    entry(player("big", 5, "RB", 2400, 3), 1601, [2]),
  ];

  it("flags value at or over the price as high, close or producing as medium, riskiest first", () => {
    const risks = atRisk(mine);
    expect(risks.map((r) => [r.player.id, r.risk])).toEqual([
      ["big", "high"],
      ["noel", "medium"],
    ]);
    expect(risks[1].reason).toBe("WR3 on HOU, 7.3 ppg, worth 0.7x a 2nd");
  });

  it("writes the case with a rounded multiple once he's worth twice the price", () => {
    const p = player("x", 9, "WR", 3000, 0);
    expect(stealCase(p, assess(p, 1124), [3])).toBe("worth ~3x a 3rd");
  });
});

describe("steal targets", () => {
  it("keeps the bargains, biggest surplus first", () => {
    const t = (p: TaxiPlayer, price: number) => ({ player: p, assessment: assess(p, price) });
    const list = [t(player("bryant", 9, "WR", 1418, 8), 1124), t(player("allen", 6, "WR", 1056, 0), 646), t(player("beck", 1, "QB", 1343, null), 4670)];
    expect(stealTargets(list).map((x) => x.player.id)).toEqual(["bryant", "allen"]);
  });
});
