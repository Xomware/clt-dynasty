import { describe, expect, it, vi } from "vitest";

vi.mock("./client", () => ({ request: vi.fn() }));

import { listReports, type AIReport } from "./ai-reports";
import { request } from "./client";

const row = (period: string, created_at: string) => ({ period, created_at, report_type: "weekly" }) as AIReport;

describe("listReports", () => {
  it("orders reports that share a created_at by period, newest week first", async () => {
    const batch = "2026-05-22T02:31:37Z";
    vi.mocked(request).mockResolvedValue({
      rows: [row("2025W13", batch), row("2026W01", "2026-10-06T12:01:00Z"), row("2025W01", batch), row("2025W17", batch)],
      next_cursor: null,
    });

    const { rows } = await listReports();

    expect(rows.map((r) => r.period)).toEqual(["2026W01", "2025W17", "2025W13", "2025W01"]);
  });
});
