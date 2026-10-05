import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("aws-amplify/auth", () => ({
  fetchAuthSession: vi.fn(async () => ({ tokens: { idToken: { toString: () => "id-token" } } })),
}));

import { AlertsProvider } from "@/lib/alerts/alerts";
import type { AIReport } from "@/lib/api/ai-reports";
import { MemberProvider } from "@/lib/member/use-member";
import { AdminAIWindow } from "./AdminAIWindow";

const ME = {
  member: { email: "member@example.com", displayName: "Roster 4", role: "admin", sleeperUserId: "" },
  linkedSleeperUserId: "",
  isAdmin: true,
};

const report = (period: string, metadata: Record<string, unknown> = {}): AIReport => ({
  pk: "LEAGUE#1",
  sk: `REPORT#weekly#${period}`,
  league_id: "1",
  report_type: "weekly",
  period,
  body_markdown: "## Recap\n\nTeam 6 won.",
  metadata,
  created_at: "2026-09-30T15:42:11Z",
});

type Reply = [number, unknown];
let routes: Record<string, Reply>;

beforeEach(() => {
  routes = { "GET /clt/me": [200, ME], "GET /ai-reports/list": [200, { rows: [report("2026W04"), report("2026W03", { is_redacted: "true" })], next_cursor: null }] };
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const key = `${init?.method ?? "GET"} ${new URL(String(input)).pathname}`;
    const hit = routes[key];
    if (!hit) throw new Error(`unmocked ${key}`);
    return new Response(JSON.stringify(hit[1]), { status: hit[0] });
  });
});
afterEach(() => {
  vi.restoreAllMocks();
});

const open = (tab?: string) =>
  render(
    <MemberProvider>
      <AlertsProvider>
        <AdminAIWindow params={tab ? { tab } : {}} />
      </AlertsProvider>
    </MemberProvider>,
  );
const sent = (path: string) =>
  vi
    .mocked(fetch)
    .mock.calls.filter(([u]) => String(u).endsWith(path))
    .map(([, init]) => JSON.parse(String(init?.body)));

const DRY: unknown = {
  Success: true,
  status: "dry_run_sent",
  period: "2026W04",
  dry_run: true,
  delivery_count: 1,
  token_usage: { input_tokens: 1200, output_tokens: 800 },
  report: report("2026W04"),
  previews: [{ recipient_user_id: "u2", recipient_email: "r2@example.com", display_name: "Roster 2", subject: "Week 4 recap", text_body: "Hi Roster 2", html_body_excerpt: "" }],
};

describe("Admin: AI Review", () => {
  it("runs a dry run for a chosen week and shows the report and email previews", async () => {
    routes["POST /admin/ai-review-weekly-trigger"] = [200, DRY];
    open();
    fireEvent.change(await screen.findByLabelText(/Week/), { target: { value: "4" } });
    fireEvent.click(screen.getByRole("button", { name: "Run dry run" }));

    expect(await screen.findByText("dry run sent")).toBeTruthy();
    expect(sent("/admin/ai-review-weekly-trigger")).toEqual([{ dry_run: true, force: false, week: 4 }]);
    expect(screen.getByRole("article", { name: "Weekly Recap, Week 4, 2026" })).toBeTruthy();
    expect(screen.getByText("Roster 2: Week 4 recap")).toBeTruthy();
  });

  it("confirms before a real send, and sends nothing on Cancel", async () => {
    routes["POST /admin/ai-review-preseason-trigger"] = [200, { Success: true, status: "broadcast", dry_run: false, delivery_count: 12 }];
    open();
    fireEvent.change(await screen.findByLabelText("Report"), { target: { value: "preseason" } });
    expect(screen.queryByLabelText(/Week/)).toBeNull();
    fireEvent.click(screen.getByLabelText(/Dry run/));
    fireEvent.click(screen.getByLabelText(/Force/));
    fireEvent.click(screen.getByRole("button", { name: "Generate and send" }));
    fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(sent("/admin/ai-review-preseason-trigger")).toHaveLength(0);

    fireEvent.click(screen.getByRole("button", { name: "Generate and send" }));
    fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Send" }));
    expect(await screen.findByText("12")).toBeTruthy();
    expect(sent("/admin/ai-review-preseason-trigger")).toEqual([{ dry_run: false, force: true }]);
  });

  it("shows why a trigger was refused", async () => {
    routes["POST /admin/ai-review-postdraft-trigger"] = [409, { Success: false, error: "already_generated", Message: "Report already exists for 2026" }];
    open();
    fireEvent.change(await screen.findByLabelText("Report"), { target: { value: "postdraft" } });
    fireEvent.click(screen.getByRole("button", { name: "Run dry run" }));
    expect((await screen.findByRole("alert")).textContent).toBe("Couldn’t generate it: Report already exists for 2026");
  });

  it("flags a report and keeps the server's metadata", async () => {
    routes["POST /admin/reports-flag"] = [200, { Success: true, metadata: { is_redacted: "true" } }];
    open("reports");
    const row = await screen.findByRole("listitem", { name: "Weekly Recap, Week 4, 2026" });
    fireEvent.click(within(row).getByLabelText(/Redacted: hidden/));
    expect(await within(row).findByText("Redacted")).toBeTruthy();
    expect(sent("/admin/reports-flag")).toEqual([{ league_id: "1", report_type: "weekly", period: "2026W04", flag: "is_redacted", value: true }]);
    expect(within(screen.getByRole("listitem", { name: "Weekly Recap, Week 3, 2026" })).getByLabelText(/Redacted: hidden/)).toHaveProperty("checked", true);
  });

  it("shows a refused flag", async () => {
    routes["POST /admin/reports-flag"] = [403, { Success: false, Message: "Not authorized" }];
    open("reports");
    const row = await screen.findByRole("listitem", { name: "Weekly Recap, Week 4, 2026" });
    fireEvent.click(within(row).getByLabelText(/Do not broadcast/));
    expect((await within(row).findByRole("alert")).textContent).toBe("Couldn’t change the flag: Not authorized");
    expect(within(row).getByLabelText(/Do not broadcast/)).toHaveProperty("checked", false);
  });
});
