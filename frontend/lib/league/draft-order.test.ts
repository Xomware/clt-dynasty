import { describe, expect, it } from "vitest";

import { draftFixture, fixture, pastFixture } from "@/lib/test/league-mock";
import players from "@/lib/test/fixtures/players.json";
import { finishOrder, fromSleeper } from "./brackets";
import { draftOrder, optimalPoints, seasonHpp } from "./draft-order";
import { playoffSeeds, sortStandings } from "./standings";
import { startingSlots } from "./use-week-games";

const positions = players as Record<string, { position?: string }>;
const positionOf = (id: string) => positions[id]?.position;
const slots = startingSlots(fixture.league.roster_positions);

describe("draftOrder", () => {
  it("gives 2025's results the order Sleeper used for the real 2026 draft", () => {
    const s = pastFixture["1181789700187090944"];
    const standings = sortStandings(s.rosters);
    const seeds = playoffSeeds(standings);
    const finish = finishOrder(fromSleeper(s.winners_bracket, seeds), seeds);
    const order = draftOrder(standings, seeds, 6, finish).map((d) => d.rosterId);

    const real = draftFixture[fixture.league.league_id].drafts[0].draft.draft_order!;
    const bySlot = Object.entries(real)
      .sort(([, a], [, b]) => a - b)
      .map(([user]) => Number(user.slice(1)));
    expect(order).toEqual(bySlot);
    expect(order.slice(-2)).toEqual([4, 10]);
  });

  it("projects the playoff group by seed, best seed last, before the final", () => {
    const standings = sortStandings(fixture.rosters);
    const seeds = playoffSeeds(standings);
    const order = draftOrder(standings, seeds, 6, null);
    expect(order.filter((d) => d.playoff).map((d) => d.rosterId)).toEqual([11, 7, 12, 5, 4, 2]);
    expect(order.slice(0, 2).map((d) => d.rosterId)).toEqual([1, 6]);
  });

  it("orders the rest by lowest HPP under proposal #57", () => {
    const standings = sortStandings(fixture.rosters);
    const seeds = playoffSeeds(standings);
    const hpp = new Map(standings.map((s, i) => [s.rosterId, i === 6 ? 1 : 100]));
    const order = draftOrder(standings, seeds, 6, null, hpp);
    expect(order[0].rosterId).toBe(standings[6].rosterId);
    expect(order).toHaveLength(12);
  });
});

describe("HPP", () => {
  it("is at least what the team started, from the real weeks", () => {
    const weeks = ["1", "2", "3"].map((w) => fixture.matchups[w]);
    const hpp = seasonHpp(weeks, slots, positionOf);
    for (const r of fixture.rosters) {
      const started = weeks.flat().filter((m) => m.roster_id === r.roster_id).reduce((t, m) => t + m.points, 0);
      expect(hpp.get(r.roster_id)).toBeGreaterThanOrEqual(started - 0.001);
    }
  });

  it("fills specific slots before flex", () => {
    const points = { qb: 30, qb2: 20, rb: 5, wr: 10, te: 8 };
    const pos: Record<string, string> = { qb: "QB", qb2: "QB", rb: "RB", wr: "WR", te: "TE" };
    expect(optimalPoints(points, ["QB", "FLEX", "SUPER_FLEX"], (id) => pos[id])).toBe(30 + 10 + 20);
  });
});
