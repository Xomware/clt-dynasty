import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("aws-amplify/auth", () => ({
  fetchAuthSession: vi.fn(async () => ({ tokens: { idToken: { toString: () => "id-token" } } })),
}));
const me = vi.hoisted(() => ({ sleeperUserId: "u4" }));
vi.mock("@/lib/api/clt", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/clt")>()),
  getCltMe: vi.fn(async () => ({
    member: { email: "member@example.com", displayName: "Roster 4", role: "member", sleeperUserId: me.sleeperUserId },
    linkedSleeperUserId: "",
    isAdmin: false,
  })),
}));

import { API_BASE, LEAGUE_ID } from "@/lib/config";
import { DrillContext, NavigateContext } from "@/lib/desktop/navigation";
import { clearLeagueCache } from "@/lib/league/cache";
import { MemberProvider } from "@/lib/member/use-member";
import { fixture, stubSleeper } from "@/lib/test/league-mock";
import { BuzzHome } from "./BuzzHome";

const report = (period: string, title: string) => ({
  pk: `league#${LEAGUE_ID}`,
  sk: `weekly#${period}`,
  league_id: LEAGUE_ID,
  report_type: "weekly",
  period,
  body_markdown: `# ${title}\n\nThree upsets and a blowout.`,
  metadata: {},
  created_at: `2026-09-${period.slice(-2)}T12:00:00Z`,
});

const ROUTES = {
  [`${API_BASE}/announcements/list`]: { Success: true, count: 0, rows: [] },
  [`/league/${LEAGUE_ID}/drafts`]: [],
  [`${API_BASE}/clt/world-cup`]: { leagueId: LEAGUE_ID, season: "2026", divisions: [] },
  [`${API_BASE}/clt/proposals-list`]: { proposals: [] },
  [`${API_BASE}/clt/taxi-list`]: { leagueId: LEAGUE_ID, requests: [] },
  [`${API_BASE}/ai-reports/list`]: { rows: [report("2026W03", "Week 3 chaos"), report("2026W04", "Week 4 bites back")], next_cursor: null },
  [`/league/${LEAGUE_ID}/transactions/4`]: [],
  [`/league/${LEAGUE_ID}/transactions/3`]: [],
  [`/league/${LEAGUE_ID}/matchups/5`]: fixture.matchups["1"],
};

beforeEach(() => {
  me.sleeperUserId = "u4";
  stubSleeper(ROUTES);
});
afterEach(() => {
  vi.restoreAllMocks();
  clearLeagueCache();
});

const go = vi.fn();
const renderHub = () =>
  render(
    <MemberProvider>
      <DrillContext value={go}>
        <NavigateContext value={go}>
          <BuzzHome />
        </NavigateContext>
      </DrillContext>
    </MemberProvider>,
  );

describe("Buzz City Home", () => {
  it("leads with the member's team, its record and this week's game", async () => {
    renderHub();
    const game = within(await screen.findByRole("region", { name: "Week 4 game" }));
    expect(game.getByText("Up 42.9")).toBeTruthy();
    expect(screen.getByRole("article", { name: "Your team, Team 4" })).toBeTruthy();
    const stats = screen.getByText("Record").closest("dl")!;
    expect(within(stats).getByText("3-0")).toBeTruthy();
    expect(within(stats).getByText(/^W\d$/)).toBeTruthy();
  });

  it("titles the page with the league's lockup", () => {
    renderHub();
    const title = screen.getByRole("heading", { level: 1, name: "CLT Dynasty Fantasy Football" });
    expect(title.querySelector("img")?.getAttribute("srcset")).toMatch(/lockup.* 1x, .*lockup@2x.* 2x/);
  });

  it("sends lineups out to Sleeper", () => {
    renderHub();
    const actions = within(screen.getByRole("list", { name: "Quick actions" }));
    expect(actions.getByRole("link", { name: /Set your lineup in Sleeper/ }).getAttribute("href")).toBe(`https://sleeper.com/leagues/${LEAGUE_ID}/team`);
  });

  it("puts proposing a rule and stealing a taxi player on their own cards", async () => {
    renderHub();
    const proposals = within(screen.getByRole("region", { name: "Rule proposals" }));
    fireEvent.click(proposals.getByRole("button", { name: "Propose a rule" }));
    expect(go).toHaveBeenLastCalledWith({ kind: "proposals", params: {} });
    const taxi = within(screen.getByRole("region", { name: "Taxi steal requests" }));
    fireEvent.click(taxi.getByRole("button", { name: "Steal a taxi player" }));
    expect(go).toHaveBeenLastCalledWith({ kind: "taxi", params: {} });
  });

  it("runs the standings race with every team, the member's marked and seeds tagged", async () => {
    renderHub();
    const race = within(await screen.findByRole("list", { name: /Standings by record/ }));
    const rows = await race.findAllByRole("listitem");
    expect(rows).toHaveLength(12);
    expect(rows.find((r) => r.getAttribute("data-mine"))?.querySelector(".u-race-name")?.textContent).toBe("Team 4");
    expect(race.getAllByText(/^Seed \d$/)).toHaveLength(fixture.league.settings.playoff_teams);
  });

  it("lists the recaps newest first, each opening its report", async () => {
    renderHub();
    const recaps = within(await screen.findByRole("list", { name: "Recaps, newest first" }));
    expect(recaps.getAllByRole("listitem").map((li) => li.querySelector(".u-recap-title")?.textContent)).toEqual(["Week 4 bites back", "Week 3 chaos"]);
    fireEvent.click(recaps.getAllByRole("button", { name: "Read it" })[0]);
    expect(go).toHaveBeenLastCalledWith({ kind: "ai-report", params: { period: "2026W04", type: "weekly" } });
  });

  it("asks a member with no linked roster to link one", async () => {
    me.sleeperUserId = "";
    renderHub();
    expect(await screen.findByText(/isn.t linked to a CLT roster yet/)).toBeTruthy();
  });
});
