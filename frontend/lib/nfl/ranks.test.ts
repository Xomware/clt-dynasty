import { describe, expect, it } from "vitest";

import { parseValues } from "@/lib/analyzer/values";
import type { SleeperStatRow } from "@/lib/sleeper/types";
import { fixture } from "@/lib/test/league-mock";
import { dynastyRanks, fantasyPoints, positionRanks } from "./ranks";

const scoring = fixture.league.scoring_settings;
const row = (player_id: string, position: string, stats: Record<string, number>): SleeperStatRow => ({ player_id, stats, player: { position } });

describe("fantasy points in CLT scoring", () => {
  it("scores the TE premium that Sleeper's pts_ppr leaves out", () => {
    // T.J. Hockenson, 2026 weeks 1-4: CLT's matchups credited him 58.5; pts_ppr says 47.5.
    expect(fantasyPoints({ rec: 22, rec_yd: 195, rec_td: 1, bonus_rec_te: 22, pts_ppr: 47.5, rec_tgt: 30 }, scoring)).toBe(58.5);
  });

  it("counts a projection's missed kicks by distance as missed field goals", () => {
    // Brandon Aubrey's week 5 projection.
    const stats = {
      fgm_20_29: 0.37,
      fgm_30_39: 0.48,
      fgm_40_49: 0.48,
      fgm_50p: 0.42,
      fgmiss_30_39: 0.04,
      fgmiss_40_49: 0.04,
      fgmiss_50p: 0.12,
      xpm: 2.77,
      xpmiss: 0.13,
    };
    expect(fantasyPoints(stats, scoring)).toBe(9.01);
  });
});

describe("position ranks", () => {
  const ranks = positionRanks(
    [
      row("wr-b", "WR", { rec: 5, rec_yd: 60 }),
      row("te", "TE", { rec: 5, rec_yd: 60, bonus_rec_te: 5 }),
      row("wr-a", "WR", { rec: 8, rec_yd: 100 }),
      row("bye", "WR", {}),
      row("zero", "WR", { rec_tgt: 2 }),
      { player_id: "nopos", stats: { rec: 9 } },
    ],
    scoring,
  );

  it("ranks within each position by points", () => {
    expect(ranks.get("wr-a")).toEqual({ points: 18, rank: 1, position: "WR" });
    expect(ranks.get("wr-b")).toEqual({ points: 11, rank: 2, position: "WR" });
    expect(ranks.get("te")).toEqual({ points: 13.5, rank: 1, position: "TE" });
  });

  it("leaves out a bye week, a scoreless line and a row without a position", () => {
    expect(["bye", "zero", "nopos"].map((id) => ranks.get(id))).toEqual([undefined, undefined, undefined]);
  });
});

describe("dynasty ranks", () => {
  it("ranks FantasyCalc values overall and by position, skipping picks and unvalued players", () => {
    const values = parseValues([
      { player: { sleeperId: "qb2", position: "QB" }, value: 7000 },
      { player: { sleeperId: "wr1", position: "WR" }, value: 9000 },
      { player: { sleeperId: "qb1", position: "QB" }, value: 9500 },
      { player: { sleeperId: "none", position: "RB" }, value: 0 },
      { player: { name: "2027 1st (Early)", position: "PICK" }, value: 8000 },
    ]);
    const ranks = dynastyRanks(values);
    expect(ranks.get("qb1")).toEqual({ value: 9500, overall: 1, rank: 1, position: "QB" });
    expect(ranks.get("wr1")).toEqual({ value: 9000, overall: 2, rank: 1, position: "WR" });
    expect(ranks.get("qb2")).toEqual({ value: 7000, overall: 3, rank: 2, position: "QB" });
    expect(ranks.has("none")).toBe(false);
  });
});
