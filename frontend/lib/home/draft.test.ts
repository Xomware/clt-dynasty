import { describe, expect, it } from "vitest";

import { countdown, upcomingDraft } from "./draft";

const draft = (status: "pre_draft" | "drafting" | "paused" | "complete", season = "2027") => ({ draft_id: season, season, status, type: "linear", start_time: null });

describe("draft countdown", () => {
  it("formats days, hours and minutes down to seconds", () => {
    expect(countdown(((3 * 24 + 5) * 3600 + 7 * 60 + 9) * 1000)).toBe("3d 05h 07m 09s");
    expect(countdown((2 * 3600 + 5) * 1000)).toBe("2h 00m 05s");
    expect(countdown(65_400)).toBe("1m 05s");
  });

  it("picks the draft still to come or under way", () => {
    expect(upcomingDraft([draft("complete", "2026"), draft("pre_draft")])?.season).toBe("2027");
    expect(upcomingDraft([draft("paused")])?.status).toBe("paused");
    expect(upcomingDraft([draft("complete")])).toBeUndefined();
  });
});
