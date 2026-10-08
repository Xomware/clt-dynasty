import { describe, expect, it } from "vitest";

import { fixture } from "@/lib/test/league-mock";
import { postChecks } from "./post";

const values = (checks: ReturnType<typeof postChecks>) => Object.fromEntries(checks.map((c) => [c.label, c.value]));

describe("postChecks", () => {
  it("reads the league's own numbers", () => {
    expect(values(postChecks(fixture.league, fixture.state))).toEqual({
      "Detecting teams": "12 found",
      "Detecting divisions": "BIG10, SEC, ACC",
      "Roster slots": `${fixture.league.roster_positions.length} OK`,
      Scoring: "Superflex, full PPR",
      "Taxi squads": "4 slots OK",
      "Loading Week 4 matchups": "6 OK",
    });
  });

  it("prints the same six lines before Sleeper answers", () => {
    const checks = postChecks();
    expect(checks).toHaveLength(6);
    expect(values(checks)["Detecting teams"]).toBe("12 found");
    expect(checks.at(-1)).toEqual({ label: "Loading the league", value: "OK" });
  });

  it("loads the league, not a week, outside the regular season", () => {
    const checks = postChecks({ ...fixture.league, status: "pre_draft" }, fixture.state);
    expect(checks.at(-1)?.label).toBe("Loading the league");
  });
});
