import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("aws-amplify/auth", () => ({
  fetchAuthSession: vi.fn(async () => ({ tokens: { idToken: { toString: () => "id-token" } } })),
}));
vi.mock("@/lib/api/clt", () => ({
  getCltMe: vi.fn(async () => ({
    member: { email: "member@example.com", displayName: "Roster 4", role: "member", sleeperUserId: "u4" },
    linkedSleeperUserId: "",
  })),
}));

import { API_BASE, LEAGUE_ID } from "@/lib/config";
import { NavigateContext } from "@/lib/desktop/navigation";
import { MemberProvider } from "@/lib/member/use-member";
import { clearLeagueCache } from "@/lib/league/cache";
import { fixture, stubSleeper } from "@/lib/test/league-mock";
import { HomeWindow } from "./HomeWindow";

const row = (id: string, title: string, priority: "critical" | "info") => ({
  id,
  title,
  body: `${title} body`,
  priority,
  expires_at: null,
  is_active: true,
  display_order: 1,
  created_at: "2026-09-01T12:00:00+00:00",
  updated_at: "2026-09-01T12:00:00+00:00",
});
const NEWS = `${API_BASE}/announcements/list`;
const DRAFTS = `/league/${LEAGUE_ID}/drafts`;
const list = (rows: unknown[]) => ({ Success: true, count: rows.length, rows });
const fail = (status: number) => () => new Response(JSON.stringify({ message: "Internal server error" }), { status });

beforeEach(() => {
  stubSleeper({ [NEWS]: list([row("a1", "Deadline", "critical"), row("a2", "Dues", "info")]), [DRAFTS]: [] });
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const navigate = vi.fn();
const renderHome = () =>
  render(
    <MemberProvider>
      <NavigateContext value={navigate}>
        <HomeWindow />
      </NavigateContext>
    </MemberProvider>,
  );
const section = (name: string) => within(screen.getByRole("region", { name }));

describe("Home", () => {
  it("shows announcements, critical ones marked", async () => {
    renderHome();
    const items = await within(await screen.findByRole("region", { name: "Announcements" })).findAllByRole("listitem");
    expect(items.map((i) => i.textContent)).toEqual(["ImportantDeadlineDeadline body", "DuesDues body"]);
  });

  it("says when there are no announcements, or they fail, and retries", async () => {
    let rows: unknown = fail(502);
    stubSleeper({ [NEWS]: () => (typeof rows === "function" ? (rows as () => Response)() : new Response(JSON.stringify(rows))), [DRAFTS]: [] });
    renderHome();
    expect((await section("Announcements").findByRole("alert")).textContent).toMatch(/announcements: Internal server error/);
    rows = list([]);
    fireEvent.click(section("Announcements").getByRole("button", { name: "Try again" }));
    expect(await section("Announcements").findByText("No announcements from the commissioner right now.")).toBeTruthy();
  });

  it("scrolls the standings and drills to a team", async () => {
    renderHome();
    const chips = await section("Standings").findAllByRole("listitem");
    expect(chips.map((c) => c.querySelector(".xp-team-name")?.textContent).slice(0, 3)).toEqual(["Team 2", "Team 4", "Team 12"]);
    expect(within(chips[1]).getByRole("img", { name: "Your team" })).toBeTruthy();
    fireEvent.click(within(chips[0]).getByRole("button"));
    expect(navigate).toHaveBeenLastCalledWith({ kind: "team", params: { rosterId: 2 } });
  });

  it("lists this week's games with the member's first", async () => {
    renderHome();
    const week = await screen.findByRole("region", { name: `Week ${fixture.state.week} matchups` });
    const games = await within(week).findAllByRole("listitem");
    expect(games).toHaveLength(6);
    expect(games[0].getAttribute("data-mine")).toBe("true");
    fireEvent.click(within(week).getByRole("button", { name: "All scores and lineups" }));
    expect(navigate).toHaveBeenLastCalledWith({ kind: "scores", params: {} });
  });

  it("counts down to an upcoming draft and hides the section when there is none", async () => {
    const start = Date.now() + 90 * 60_000 + 5_000;
    stubSleeper({ [NEWS]: list([]), [DRAFTS]: [{ draft_id: "9", season: "2027", status: "pre_draft", type: "linear", start_time: start }] });
    const { unmount } = renderHome();
    const draft = await screen.findByRole("region", { name: "Upcoming draft" });
    expect(within(draft).getByText("2027 Rookie Draft")).toBeTruthy();
    expect(within(draft).getByText(/^Starts in 1h 30m 0[45]s$/)).toBeTruthy();
    unmount();
    clearLeagueCache();
    stubSleeper({ [NEWS]: list([]), [DRAFTS]: [{ draft_id: "8", season: "2026", status: "complete", type: "linear", start_time: 1 }] });
    renderHome();
    await screen.findByRole("region", { name: "Standings" });
    await screen.findAllByRole("listitem");
    expect(screen.queryByRole("region", { name: "Upcoming draft" })).toBeNull();
  });
});
