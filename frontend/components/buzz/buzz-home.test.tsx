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
import playerFixture from "@/lib/test/fixtures/players.json";
import { fixture, stubSleeper } from "@/lib/test/league-mock";
import { BuzzHome } from "./BuzzHome";

const MINE_W4 = fixture.matchups["4"].find((m) => m.roster_id === 4)!.matchup_id;
const report = (period: string, title: string) => ({
  pk: `league#${LEAGUE_ID}`,
  sk: `weekly#${period}`,
  league_id: LEAGUE_ID,
  report_type: "weekly",
  period,
  body_markdown: `# ${title}\n\nThree upsets and a blowout.`,
  metadata: { matchups: [{ matchup_id: MINE_W4, team_a: "Team 4", team_b: "Team 9", blurb: `**Team 4 over Team 9** in ${period}` }] },
  created_at: `2026-09-${period.slice(-2)}T12:00:00Z`,
});

const PROJECTIONS = "https://api.sleeper.com/projections/nfl/2026/4?season_type=regular&position[]=QB&position[]=RB&position[]=WR&position[]=TE&position[]=K";
const SCHEDULE = "https://api.sleeper.com/schedule/nfl/regular/2026";

const ROUTES = {
  [`${API_BASE}/announcements/list`]: { Success: true, count: 0, rows: [] },
  [`/league/${LEAGUE_ID}/drafts`]: [],
  [`${API_BASE}/clt/world-cup`]: { leagueId: LEAGUE_ID, season: "2026", divisions: [] },
  [`${API_BASE}/clt/proposals-list`]: { proposals: [] },
  [`${API_BASE}/clt/taxi-list`]: { leagueId: LEAGUE_ID, requests: [] },
  [`${API_BASE}/ai-reports/list?type=weekly&limit=50`]: { rows: [report("2026W03", "Week 3 chaos"), report("2026W04", "Week 4 bites back")], next_cursor: null },
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

  it("checks the member's lineup against this week's projections", async () => {
    const week4 = fixture.matchups["4"].find((m) => m.roster_id === 4)!;
    const starters = week4.starters!;
    const players = playerFixture as Record<string, { position?: string; last_name?: string }>;
    const sub = week4.players!.find((id) => !starters.includes(id) && ["RB", "WR"].includes(players[id]?.position ?? ""))!;
    const row = (id: string, rec: number) => ({ player_id: id, team: "CHA", stats: { rec }, player: { position: players[id]?.position, injury_status: null } });
    const rosters = fixture.rosters.map((r) => (r.roster_id === 4 ? { ...r, starters, players: week4.players } : r));
    stubSleeper({
      ...ROUTES,
      [`/league/${LEAGUE_ID}/rosters`]: rosters,
      // starters[6] is a FLEX: projected 5, under a bench receiver's 12.
      [PROJECTIONS]: [...starters.map((id, i) => row(id, i === 6 ? 5 : 10)), row(sub, 12)],
      [SCHEDULE]: [],
    });
    renderHub();
    const card = within(await screen.findByRole("region", { name: "Lineup check, Week 4" }));
    const swap = within(card.getByRole("list", { name: "Suggested swaps" })).getByRole("listitem");
    expect(swap.textContent).toMatch(new RegExp(`^FLEXSwap .*${players[starters[6]].last_name} 5\\.0 for .*${players[sub].last_name} 12\\.0$`));
    expect(card.getByRole("link", { name: /Set your lineup in Sleeper/ }).getAttribute("href")).toBe(`https://sleeper.com/leagues/${LEAGUE_ID}/team`);
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
    const list = screen.getByRole("list", { name: "Standings by record" });
    expect(document.getElementById(list.getAttribute("aria-describedby")!)?.textContent).toMatch(/^Bars: points for, against the league.s most \(\d+\.\d\)/);
  });

  it("leads with the latest weekly recap, the member's game called out, earlier weeks a tap away", async () => {
    renderHub();
    const feature = within(await screen.findByRole("article", { name: "Week 4 bites back" }));
    expect(feature.getByText("Three upsets and a blowout.")).toBeTruthy();
    expect(within(feature.getByRole("region", { name: "Your game" })).getByText("Team 4 over Team 9").tagName).toBe("STRONG");
    fireEvent.click(feature.getByRole("button", { name: "Read the full recap" }));
    expect(go).toHaveBeenLastCalledWith({ kind: "ai-report", params: { period: "2026W04", type: "weekly" } });
    const earlier = within(screen.getByRole("navigation", { name: "Earlier recaps" }));
    fireEvent.click(earlier.getByRole("button", { name: /Week 3.*Week 3 chaos/ }));
    expect(go).toHaveBeenLastCalledWith({ kind: "ai-report", params: { period: "2026W03", type: "weekly" } });
  });

  it("asks a member with no linked roster to link one", async () => {
    me.sleeperUserId = "";
    renderHub();
    expect(await screen.findByText(/isn.t linked to a CLT roster yet/)).toBeTruthy();
  });
});
