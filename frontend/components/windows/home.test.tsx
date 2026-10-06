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
const proposal = (id: string, title: string, status: string, createdAt: string) => ({
  id,
  title,
  description: "",
  status,
  proposedBy: "Roster 2",
  isMine: false,
  createdAt,
  updatedAt: createdAt,
  yesCount: 3,
  noCount: 1,
  myVote: null,
  voters: { yes: [], no: [] },
});
const cupTeam = (userId: string, wins: number, status: string) => ({
  userId,
  username: userId,
  teamName: `Cup ${userId}`,
  wins,
  losses: 10 - wins,
  ties: 0,
  pointsFor: 0,
  pointsAgainst: 0,
  status,
});
const tx = (id: string, patch: object) => ({
  transaction_id: id,
  type: "waiver",
  status: "complete",
  roster_ids: [4],
  adds: null,
  drops: null,
  draft_picks: [],
  waiver_budget: [],
  settings: { seq: 1 },
  status_updated: 1790770017891,
  leg: 3,
  ...patch,
});

const NEWS = `${API_BASE}/announcements/list`;
const DRAFTS = `/league/${LEAGUE_ID}/drafts`;
const CUP = `${API_BASE}/clt/world-cup`;
const PROPOSALS = `${API_BASE}/clt/proposals-list`;
const TAXI = `${API_BASE}/clt/taxi-list`;
const MOVES = (week: number) => `/league/${LEAGUE_ID}/transactions/${week}`;
const list = (rows: unknown[]) => ({ Success: true, count: rows.length, rows });
const fail = (status: number) => () => new Response(JSON.stringify({ message: "Internal server error" }), { status });

const ROUTES = {
  [NEWS]: list([row("a1", "Deadline", "critical"), row("a2", "Dues", "info")]),
  [DRAFTS]: [],
  [CUP]: {
    leagueId: LEAGUE_ID,
    season: "2026",
    divisions: [
      { division: 1, name: "BIG10", gamesRemaining: 4, teams: [cupTeam("u4", 9, "clinched"), cupTeam("gone", 8, "alive"), cupTeam("u1", 2, "eliminated")] },
    ],
  },
  [PROPOSALS]: {
    proposals: [proposal("p2", "Add a superflex", "open", "2026-09-30T12:00:00Z"), proposal("p1", "Cap the taxi", "open", "2026-09-01T12:00:00Z")],
  },
  [TAXI]: {
    leagueId: LEAGUE_ID,
    requests: [
      { playerId: "10213", rosterId: 6, requestedBy: "Roster 2", isMine: false, createdAt: "2026-09-02T12:00:00Z" },
      { playerId: "10218", rosterId: 2, requestedBy: "Roster 4", isMine: true, createdAt: "2026-10-01T12:00:00Z" },
    ],
  },
  [MOVES(4)]: [tx("t1", { type: "free_agent", adds: { "10219": 4 }, drops: { "10222": 4 }, settings: null, status_updated: 1791237871541, leg: 4 })],
  [MOVES(3)]: [
    tx("t2", { status: "failed", adds: { "10226": 4 } }),
    tx("t3", {
      type: "trade",
      roster_ids: [2, 3],
      adds: { "10229": 2, "10226": 3 },
      drops: { "10229": 3, "10226": 2 },
      draft_picks: [{ season: "2027", round: 3, roster_id: 3, owner_id: 2, previous_owner_id: 3 }],
      settings: null,
      status_updated: 1790000000000,
    }),
  ],
  [`/league/${LEAGUE_ID}/matchups/5`]: fixture.matchups["1"],
};

beforeEach(() => {
  me.sleeperUserId = "u4";
  stubSleeper(ROUTES);
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  clearLeagueCache();
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
const findSection = async (name: string) => within(await screen.findByRole("region", { name }));
// Text as read, less the avatar initials.
const squash = (el: HTMLElement) => {
  const copy = el.cloneNode(true) as HTMLElement;
  copy.querySelectorAll(".xp-avatar").forEach((a) => a.remove());
  return copy.textContent?.replace(/\s+/g, " ").trim();
};

describe("Home", () => {
  it("shows announcements, critical ones marked", async () => {
    renderHome();
    const items = await (await findSection("Announcements")).findAllByRole("listitem");
    expect(items.map((i) => i.textContent)).toEqual(["ImportantDeadlineDeadline body", "DuesDues body"]);
  });

  it("says when there are no announcements, or they fail, and retries", async () => {
    let rows: unknown = fail(502);
    stubSleeper({ ...ROUTES, [NEWS]: () => (typeof rows === "function" ? (rows as () => Response)() : new Response(JSON.stringify(rows))) });
    renderHome();
    expect((await section("Announcements").findByRole("alert")).textContent).toMatch(/announcements: Internal server error/);
    rows = list([]);
    fireEvent.click(section("Announcements").getByRole("button", { name: "Try again" }));
    expect(await section("Announcements").findByText("No announcements from the commissioner right now.")).toBeTruthy();
  });

  it("lists the standings with the member marked, and drills to a team", async () => {
    renderHome();
    const rows = await (await findSection("Standings")).findAllByRole("listitem");
    expect(rows).toHaveLength(12);
    expect(rows.map((c) => c.querySelector(".xp-team-name")?.textContent).slice(0, 3)).toEqual(["Team 2", "Team 4", "Team 12"]);
    expect(rows[1].getAttribute("data-mine")).toBe("true");
    fireEvent.click(within(rows[0]).getByRole("button"));
    expect(navigate).toHaveBeenLastCalledWith({ kind: "team", params: { rosterId: 2 } });
    fireEvent.click(section("Standings").getByRole("button", { name: "Standings" }));
    expect(navigate).toHaveBeenLastCalledWith({ kind: "standings", params: {} });
  });

  it("lists this week's live games with the member's first", async () => {
    renderHome();
    const week = await findSection(`Week ${fixture.state.week} matchups`);
    const games = await week.findAllByRole("listitem");
    expect(games).toHaveLength(6);
    expect(games[0].getAttribute("data-mine")).toBe("true");
    expect(week.getByText("Live")).toBeTruthy();
    fireEvent.click(week.getByRole("button", { name: "Scores" }));
    expect(navigate).toHaveBeenLastCalledWith({ kind: "scores", params: {} });
  });

  it("shows the member's team: rank, record, this week's game and next week's opponent", async () => {
    renderHome();
    const mine = await findSection("Your team");
    expect(squash(await mine.findByText("Rank").then((dt) => dt.parentElement!))).toBe("Rank2nd of 12");
    expect(mine.getByText("105.20")).toBeTruthy();
    expect(mine.getByText("62.32")).toBeTruthy();
    expect(mine.getByText("you lead by 42.88")).toBeTruthy();
    expect(squash(await mine.findByText("Next, Week 5").then((el) => el.parentElement!))).toBe("Next, Week 5Team 1");
    fireEvent.click(mine.getByRole("button", { name: "My Team" }));
    expect(navigate).toHaveBeenLastCalledWith({ kind: "my-team", params: {} });
  });

  it("asks a member with no roster to link Sleeper", async () => {
    me.sleeperUserId = "";
    renderHome();
    fireEvent.click(await (await findSection("Your team")).findByRole("button", { name: "Link it in Settings" }));
    expect(navigate).toHaveBeenLastCalledWith({ kind: "settings", params: {} });
  });

  it("names last season's champion", async () => {
    renderHome();
    const champ = await findSection("Reigning champion");
    expect(await champ.findByText("2025 champion, beat Team 4 in the final")).toBeTruthy();
    fireEvent.click(champ.getByRole("button", { name: "Team 10" }));
    expect(navigate).toHaveBeenLastCalledWith({ kind: "team", params: { leagueId: fixture.league.previous_league_id, rosterId: 10 } });
  });

  it("shows each division's top two in the World Cup, a departed manager by name", async () => {
    renderHome();
    const rows = await (await findSection("World Cup leaders")).findAllByRole("listitem");
    expect(rows.map(squash)).toEqual(["Team 49-1In", "Cup gone8-2Alive"]);
  });

  it("counts open proposals and shows the newest", async () => {
    renderHome();
    const card = await findSection("Rule proposals");
    expect(squash(await card.findByText("open for votes").then((el) => el.parentElement!))).toBe("2 open for votes");
    expect(card.getByText("Add a superflex")).toBeTruthy();
    expect(card.getByText("3 yes, 1 no, you haven't voted")).toBeTruthy();
  });

  it("says when there are no proposals, or they fail", async () => {
    stubSleeper({ ...ROUTES, [PROPOSALS]: { proposals: [] }, [TAXI]: fail(500) });
    renderHome();
    expect(await (await findSection("Rule proposals")).findByText(/No rule proposals yet/)).toBeTruthy();
    expect((await section("Taxi steal requests").findByRole("alert")).textContent).toMatch(/steal requests: Internal server error/);
  });

  it("lists the newest taxi steal requests with player names", async () => {
    renderHome();
    const items = await (await findSection("Taxi steal requests")).findAllByRole("listitem");
    await within(items[0]).findByText("Xavier Hutchinson");
    expect(items.map(squash)).toEqual([
      "Xavier Hutchinson (WR), Oct 1From Team 2by you",
      "Tre Tucker (WR), Sep 2From Team 6by Roster 2",
    ]);
  });

  it("lists this week's and last week's completed moves, newest first", async () => {
    renderHome();
    const items = await (await findSection("Recent transactions")).findAllByRole("listitem");
    await within(items[0]).findByText(/Chris Rodriguez/);
    expect(items).toHaveLength(2);
    expect(squash(items[0])).toMatch(/^Free agent.*Team 4adds Chris Rodriguez; drops Jayden Reed$/);
    expect(squash(items[1])).toMatch(/^Trade.*Team 2gets Rashee Rice; gets 2027 Round 3Team 3gets Andrei Iosivas$/);
  });

  it("counts down to an upcoming draft, and says when none is set", async () => {
    const start = Date.now() + 90 * 60_000 + 5_000;
    stubSleeper({ ...ROUTES, [DRAFTS]: [{ draft_id: "9", season: "2027", status: "pre_draft", type: "linear", start_time: start }] });
    const { unmount } = renderHome();
    const draft = await findSection("Upcoming draft");
    expect(await draft.findByText("2027 Rookie Draft")).toBeTruthy();
    expect(draft.getByText(/^Starts in 1h 30m 0[45]s$/)).toBeTruthy();
    unmount();
    clearLeagueCache();
    stubSleeper({ ...ROUTES, [DRAFTS]: [{ draft_id: "8", season: "2026", status: "complete", type: "linear", start_time: 1 }] });
    renderHome();
    expect(await (await findSection("Upcoming draft")).findByText("No draft on the calendar yet.")).toBeTruthy();
  });
});
