import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("aws-amplify/auth", () => ({
  fetchAuthSession: vi.fn(async () => ({ tokens: { idToken: { toString: () => "id-token" } } })),
}));

import type { AIReport, ReportType } from "@/lib/api/ai-reports";
import { API_BASE } from "@/lib/config";
import type { WindowLink } from "@/lib/desktop/deep-link";
import { NavigateContext } from "@/lib/desktop/navigation";
import { stubSleeper } from "@/lib/test/league-mock";
import { AIReportWindow, AIReviewWindow, readReportLink } from "./AIReviewWindow";
import { DraftHistoryWindow } from "./DraftHistoryWindow";

const report = (type: ReportType, period: string, patch: Partial<AIReport> = {}): AIReport => ({
  pk: "LEAGUE#1",
  sk: `REPORT#${type}#${period}`,
  league_id: "1",
  report_type: type,
  period,
  body_markdown: `## ${period}\n\nTeam 6 had a **big** week.`,
  metadata: {},
  created_at: "2026-09-30T15:42:11Z",
  ...patch,
});

const list = (rows: AIReport[], next_cursor: string | null = null) => ({ rows, next_cursor, filters: {} });
const json = (status: number, body: unknown) => () => new Response(JSON.stringify(body), { status });
const url = (q: string) => `${API_BASE}/ai-reports/${q}`;

beforeEach(() => {
  stubSleeper({
    [url("list")]: list([report("weekly", "2026W04"), report("weekPreview", "2026W05", { metadata: { is_redacted: "true" } })], "c1"),
    [url("list?cursor=c1")]: list([report("preseason", "2026-PRESEASON")]),
    [url("list?type=weekly")]: list([report("weekly", "2026W04")]),
  });
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("AI Review", () => {
  it("lists reports newest first and drills into one", async () => {
    const navigate = vi.fn<(to: WindowLink) => void>();
    render(
      <NavigateContext value={navigate}>
        <AIReviewWindow />
      </NavigateContext>,
    );
    const items = within(await screen.findByRole("list", { name: "AI reviews" })).getAllByRole("button");
    expect(items.map((b) => b.textContent)).toEqual([
      "Weekly RecapWeek 4, 2026Sep 30, 2026",
      "Week PreviewWeek 5, 2026RedactedSep 30, 2026",
    ]);
    fireEvent.click(items[0]);
    expect(navigate).toHaveBeenCalledWith({ kind: "ai-report", params: { type: "weekly", period: "2026W04" } });
  });

  it("pages back with the cursor and filters by type", async () => {
    render(<AIReviewWindow />);
    fireEvent.click(await screen.findByRole("button", { name: "Load older reports" }));
    expect(await screen.findByText("2026 preseason")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Load older reports" })).toBeNull();

    fireEvent.change(screen.getByLabelText("Show"), { target: { value: "weekly" } });
    expect(await screen.findByText("Week 4, 2026")).toBeTruthy();
    expect(screen.queryByText("2026 preseason")).toBeNull();
  });

  it("shows the empty and failed list", async () => {
    stubSleeper({ [url("list")]: json(500, { error: { message: "Internal server error" } }), [url("list?type=mock")]: list([]) });
    render(<AIReviewWindow />);
    expect((await screen.findByRole("alert")).textContent).toBe("Couldn’t load AI reviews: Internal server error");
    fireEvent.change(screen.getByLabelText("Show"), { target: { value: "mock" } });
    expect(await screen.findByText("No Mock Draft reports yet.")).toBeTruthy();
  });

  it("finds a report by period across pages and renders its markdown", async () => {
    stubSleeper({
      [url("list?type=weekly")]: list([report("weekly", "2026W04")], "c2"),
      [url("list?type=weekly&cursor=c2")]: list([report("weekly", "2026W02")]),
    });
    render(<AIReportWindow params={{ type: "weekly", period: "2026W02" }} />);
    expect(await screen.findByRole("heading", { name: "2026W02" })).toBeTruthy();
    expect(screen.getByText("big").tagName).toBe("STRONG");
  });

  it("reads back the link the window writes", () => {
    expect(readReportLink("2026W04:weekly")).toEqual({ period: "2026W04", type: "weekly" });
    expect(readReportLink("2026W04:nonsense")).toBeNull();
  });

  it("says so when the report is gone", async () => {
    render(<AIReportWindow params={{ type: "weekly", period: "2026W09" }} />);
    expect(await screen.findByText(/This report isn’t available/)).toBeTruthy();
  });
});

describe("Draft History: Recap and Mocks", () => {
  const pick = (n: number, round: number, slot: number, name: string) => ({
    pick_no: String(n),
    round: String(round),
    slot,
    user_id: "u1",
    team: `Team ${slot}`,
    handle: `user${slot}`,
    player_id: String(n),
    player_name: name,
    position: "RB",
    nfl_team: "ARI",
    value: "91.5",
  });
  const mock = (personality: string, picks: ReturnType<typeof pick>[]) =>
    report("mock", `2027-${personality}`, { body_markdown: "", metadata: { personality, draft_year: "2027", picks } });

  it("shows the latest post-draft review", async () => {
    stubSleeper({ [url("latest?type=postDraft")]: { report: report("postDraft", "2026") } });
    render(<DraftHistoryWindow params={{ tab: "recap" }} />);
    expect(await screen.findByRole("article", { name: "Post-Draft, 2026" })).toBeTruthy();
  });

  it("says so before the first recap", async () => {
    stubSleeper({ [url("latest?type=postDraft")]: { report: null } });
    render(<DraftHistoryWindow params={{ tab: "recap" }} />);
    expect(await screen.findByText(/No recap yet/)).toBeTruthy();
  });

  it("shows each mock style's picks by round", async () => {
    stubSleeper({
      [url("list?type=mock")]: list([
        mock("bpa", [pick(2, 1, 2, "Second Back"), pick(1, 1, 1, "First Back"), pick(13, 2, 1, "Third Back")]),
        mock("wildcard", [pick(1, 1, 1, "Wild Pick")]),
        mock("bpa", [pick(1, 1, 1, "Older Run")]),
      ]),
    });
    render(<DraftHistoryWindow params={{ tab: "mocks" }} />);
    const round1 = await screen.findByRole("region", { name: "Round 1" });
    expect(within(round1).getAllByRole("listitem").map((li) => li.textContent)).toEqual([
      "1.01First Back RB ARITeam 1",
      "1.02Second Back RB ARITeam 2",
    ]);
    expect(screen.getAllByRole("button", { name: /Best Player Available|Wildcard/ })).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Wildcard" }));
    expect(await screen.findByText("Wild Pick")).toBeTruthy();
    expect(screen.queryByText("Older Run")).toBeNull();
  });
});
