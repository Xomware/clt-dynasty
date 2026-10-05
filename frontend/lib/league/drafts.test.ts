import { describe, expect, it } from "vitest";

import { draftFixture, fixture, pastFixture } from "@/lib/test/league-mock";
import type { SleeperDraft } from "@/lib/sleeper/types";
import { draftBoard, latestDraft, pickNumber } from "./drafts";

const seasons = [
  { rosters: fixture.rosters, ...draftFixture[fixture.league.league_id] },
  ...Object.entries(pastFixture).map(([id, s]) => ({ rosters: s.rosters, ...draftFixture[id] })),
].slice(0, 2);

describe("draftBoard", () => {
  it.each(seasons.map((s) => [s.drafts[0].draft.season, s] as const))(
    "puts every %s pick with the roster Sleeper says made it, from the order and trades alone",
    (_, s) => {
      const { draft, picks } = s.drafts[0];
      // Built before any pick is made, so ownership comes only from draft_order and traded_picks.
      const before = draftBoard(draft, [], s.traded_picks, s.rosters).flat();
      for (const p of picks) {
        expect(before.find((c) => c.round === p.round && c.slot === p.draft_slot)?.owner).toBe(p.roster_id);
      }
      expect(before.filter((c) => c.from !== null).length).toBeGreaterThan(0);
    },
  );

  it("fills made picks in pick order", () => {
    const { draft, picks } = seasons[0].drafts[0];
    const board = draftBoard(draft, picks, seasons[0].traded_picks, seasons[0].rosters);
    expect(board).toHaveLength(5);
    expect(board[0].map((c) => c.pickNo)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(board[0][0]).toMatchObject({ owner: 6, from: null, pick: { player_id: "13287" } });
  });

  it("has no owners before Sleeper sets the order", () => {
    const draft = { ...seasons[0].drafts[0].draft, draft_order: null };
    expect(draftBoard(draft, [], [], seasons[0].rosters)[0][0]).toMatchObject({ owner: null, from: null, pick: null });
  });
});

describe("pickNumber", () => {
  const draft = { type: "snake", settings: { rounds: 3, teams: 12 } } as SleeperDraft;
  it("runs a snake draft's even rounds backwards", () => {
    expect([pickNumber(draft, 1, 1), pickNumber(draft, 2, 1), pickNumber(draft, 2, 12)]).toEqual([1, 24, 13]);
    expect(pickNumber({ ...draft, type: "linear" }, 2, 1)).toBe(13);
  });
});

describe("latestDraft", () => {
  it("takes the latest scheduled draft", () => {
    const d = seasons[0].drafts[0].draft;
    expect(latestDraft([{ ...d, draft_id: "b", start_time: 2 }, { ...d, draft_id: "a", start_time: 1 }])?.draft_id).toBe("b");
    expect(latestDraft([])).toBeNull();
  });
});
