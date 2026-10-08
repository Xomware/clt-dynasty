import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/client", () => ({ request: vi.fn() }));

import type { AIReport } from "@/lib/api/ai-reports";
import { request } from "@/lib/api/client";
import { matchupBlurb, recapParts, weeklyRecaps } from "./recap";

const report = (period: string, body_markdown = "", metadata: Record<string, unknown> = {}, created_at = "2026-10-06T12:00:00Z") =>
  ({ period, body_markdown, metadata, created_at, report_type: "weekly" }) as AIReport;

describe("weekly recaps", () => {
  it("asks for one 50-row page of weeklies and orders it by season and week", async () => {
    vi.mocked(request).mockResolvedValue({
      // The 2025 backfill landed after the 2026 weeks here, so created_at alone would bury them.
      rows: [report("2025W17", "", {}, "2026-10-07T00:00:00Z"), report("2026W02"), report("2026W04"), report("2025W09", "", {}, "2026-10-07T00:00:00Z"), report("2026W03"), report("2026W01")],
      next_cursor: null,
    });
    const rows = await weeklyRecaps();
    expect(vi.mocked(request)).toHaveBeenCalledWith("/ai-reports/list?type=weekly&limit=50");
    expect(rows.map((r) => r.period)).toEqual(["2026W04", "2026W03", "2026W02", "2026W01", "2025W17", "2025W09"]);
  });

  it("takes the second heading as the title and the first prose as the lede", () => {
    const r = report("2026W04", "# Week 4 Recap — 2026\n\n## Reese Stands **Alone**\n\nThe league's only unbeaten.\n\n**Team 4 148.5 over Team 6 62.3** by 86.1");
    expect(recapParts(r)).toEqual({ title: "Reese Stands Alone", lede: "The league's only unbeaten." });
  });

  it("falls back to the week when a recap has a single heading or none", () => {
    expect(recapParts(report("2025W09", "# Halloween chaos\nTwo ties."))).toEqual({ title: "Halloween chaos", lede: "Two ties." });
    expect(recapParts(report("2025W10", "Just prose.")).title).toBe("Week 10 recap, 2025");
  });

  it("finds the member's game by matchup id, else by team name", () => {
    const r = report("2026W04", "", {
      matchups: [
        { matchup_id: 1, team_a: "Team 12", team_b: "Team 1", blurb: "**Team 12 154.6 over Team 1 123.8**" },
        { matchup_id: "2", team_a: "Team 4", team_b: "Team 6", blurb: "**Team 4 148.5 over Team 6 62.3**" },
      ],
    });
    expect(matchupBlurb(r, 2, null)).toBe("**Team 4 148.5 over Team 6 62.3**");
    expect(matchupBlurb(r, null, "Team 1")).toBe("**Team 12 154.6 over Team 1 123.8**");
    expect(matchupBlurb(r, 7, "Team 9")).toBeNull();
    expect(matchupBlurb(report("2026W04"), 2, "Team 4")).toBeNull();
  });
});
