import { describe, expect, it } from "vitest";

import { fixture } from "@/lib/test/league-mock";
import { pointsText, scoringGroups } from "./scoring";

describe("scoringGroups", () => {
  it("groups the league's real scoring, biggest first, without zeros or kicking", () => {
    const groups = scoringGroups(fixture.league.scoring_settings, fixture.league.roster_positions);
    expect(groups.map((g) => g.name)).toEqual(["Passing", "Rushing", "Receiving", "Returns", "Fumbles"]);
    expect(groups[0].rules.map((r) => [r.label, r.value])).toEqual([
      ["Pass TD", 4],
      ["Interception thrown", -2],
      ["Pass 2PT", 2],
      ["Pass yards", 0.04],
    ]);
    expect(groups[2].rules.find((r) => r.key === "bonus_rec_te")?.value).toBe(0.5);
    expect(groups.flatMap((g) => g.rules).some((r) => r.key === "fum")).toBe(false);
  });

  it("shows kicking when the lineup has a kicker", () => {
    const groups = scoringGroups(fixture.league.scoring_settings, [...fixture.league.roster_positions, "K"]);
    expect(groups.at(-1)?.rules.map((r) => r.label)).toContain("FG 50+");
  });
});

describe("pointsText", () => {
  it("reads yardage per yards and signs the rest", () => {
    expect(pointsText("pass_yd", 0.04)).toBe("+0.04 (1 per 25 yds)");
    expect(pointsText("rush_yd", 0.1)).toBe("+0.1 (1 per 10 yds)");
    expect(pointsText("fum_lost", -2)).toBe("-2");
  });
});
