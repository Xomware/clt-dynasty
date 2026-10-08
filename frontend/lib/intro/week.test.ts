import { afterEach, describe, expect, it, vi } from "vitest";

import { LEAGUE_ID } from "@/lib/config";
import { fixture, stubSleeper } from "@/lib/test/league-mock";
import { introWeek } from "./week";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("introWeek", () => {
  it("pairs the live week's games with team names, pictures and points", async () => {
    stubSleeper();
    const week = await introWeek();
    expect(week?.label).toBe(`WEEK ${fixture.state.week} LIVE`);
    expect(week?.games).toHaveLength(6);
    const [a, b] = week!.games[0];
    expect(a.name).toMatch(/^Team \d+$/);
    expect(b.name).toMatch(/^Team \d+$/);
    expect(a.points + b.points).toBeGreaterThan(0);
  });

  it("shows last week's finals until somebody scores", async () => {
    const week = fixture.state.week;
    const unplayed = fixture.matchups[String(week)].map((m) => ({ ...m, points: 0 }));
    stubSleeper({ [`/league/${LEAGUE_ID}/matchups/${week}`]: unplayed });
    expect((await introWeek())?.label).toBe(`WEEK ${week - 1} FINAL`);
  });

  it("has nothing to show before the draft", async () => {
    stubSleeper({ [`/league/${LEAGUE_ID}`]: { ...fixture.league, status: "pre_draft" } });
    expect(await introWeek()).toBeNull();
  });
});
