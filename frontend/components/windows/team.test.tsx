import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("aws-amplify/auth", () => ({
  fetchAuthSession: vi.fn(async () => ({ tokens: { idToken: { toString: () => "id-token" } } })),
}));

import { LEAGUE_ID } from "@/lib/config";
import { NavigateContext } from "@/lib/desktop/navigation";
import { MemberProvider } from "@/lib/member/use-member";
import { AlertsProvider } from "@/lib/alerts/alerts";
import { LeagueWindow } from "./LeagueWindow";
import { ProfileWindow } from "./ProfileWindow";
import { SettingsWindow } from "./SettingsWindow";
import { MyTeamWindow, TeamWindow } from "./TeamWindow";

const OTHER = "1180000000000000001";

const user = (rosterId: number) => ({
  user_id: `u${rosterId}`,
  display_name: `manager${rosterId}`,
  avatar: null,
  metadata: { team_name: `Team Name ${rosterId}` },
});

const roster = (roster_id: number, wins: number, division: number, extra = {}) => ({
  roster_id,
  owner_id: `u${roster_id}`,
  co_owners: null,
  starters: [],
  players: [],
  taxi: null,
  reserve: null,
  settings: { wins, losses: 3 - wins, ties: 0, fpts: 300 + roster_id, fpts_decimal: 50, division },
  metadata: { streak: "2W" },
  ...extra,
});

const LEAGUE = {
  league_id: LEAGUE_ID,
  name: "Charlotte Dynasty League",
  season: "2026",
  status: "in_season",
  avatar: null,
  total_rosters: 3,
  previous_league_id: null,
  roster_positions: ["QB", "RB", "FLEX", "BN", "BN"],
  settings: { divisions: 2 },
  metadata: { division_1: "BIG10", division_2: "SEC" },
};

const PLAYERS = {
  "4984": { player_id: "4984", first_name: "Josh", last_name: "Allen", position: "QB", team: "BUF", age: 30, years_exp: 8 },
  "9509": { player_id: "9509", first_name: "Bijan", last_name: "Robinson", position: "RB", team: "ATL", age: 24, years_exp: 3, injury_status: "Questionable" },
  "12500": { player_id: "12500", first_name: "Rookie", last_name: "Wideout", position: "WR", age: 21, years_exp: 0 },
  DAL: { player_id: "DAL", first_name: "Dallas", last_name: "Cowboys", position: "DEF", team: "DAL" },
  "7777": { player_id: "7777", first_name: "Taxi", last_name: "Back", position: "RB", team: "CAR" },
};

const ROSTERS = [
  roster(1, 1, 1),
  roster(4, 3, 2, { starters: ["4984", "0", "9509"], players: ["4984", "9509", "12500", "DAL", "7777"], taxi: ["7777"] }),
  roster(6, 2, 2),
];

type Reply = [number, unknown];
let routes: Record<string, Reply | (() => Reply)>;

const sleeper = (path: string, body: unknown): Record<string, Reply> => ({ [`sleeper ${path}`]: [200, body] });

beforeEach(() => {
  routes = {
    "GET /clt/me": [200, { member: { email: "m@example.com", displayName: "Roster 4", role: "member", sleeperUserId: "u4" }, linkedSleeperUserId: "" }],
    "GET /players/list": [200, { count: Object.keys(PLAYERS).length, players: PLAYERS }],
    ...sleeper(`/league/${LEAGUE_ID}`, LEAGUE),
    ...sleeper(`/league/${LEAGUE_ID}/users`, [user(1), user(4), user(6)]),
    ...sleeper(`/league/${LEAGUE_ID}/rosters`, ROSTERS),
    ...sleeper("/state/nfl", { season: "2026", league_season: "2026", week: 4, season_type: "regular" }),
  };
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = new URL(String(input));
    const key = url.host === "api.sleeper.app" ? `sleeper ${url.pathname.replace("/v1", "")}` : `${init?.method ?? "GET"} ${url.pathname}`;
    const hit = routes[key];
    if (!hit) throw new Error(`unmocked ${key}`);
    const [status, body] = typeof hit === "function" ? hit() : hit;
    return new Response(JSON.stringify(body), { status });
  });
});
afterEach(() => {
  vi.restoreAllMocks();
});

const inMember = (ui: React.ReactNode) => render(<MemberProvider>{ui}</MemberProvider>);
const group = (name: string) => within(screen.getByRole("region", { name }));

describe("Team window", () => {
  it("shows the team's record, ranks and roster with Xomper's player names", async () => {
    inMember(<TeamWindow params={{ rosterId: 4 }} />);

    const head = within(await screen.findByRole("region", { name: "Team Name 4" }));
    expect(head.getByText("3-0")).toBeTruthy();
    expect(head.getByText("W2")).toBeTruthy();
    expect(head.getByRole("button", { name: "1st of 3" })).toBeTruthy();
    expect(head.getByText("SEC").nextSibling?.textContent).toBe("1st of 2");
    expect(head.getByRole("img", { name: "Your team" })).toBeTruthy();

    await screen.findByRole("region", { name: "Starters" });
    const starters = group("Starters").getAllByRole("row").slice(1).map((r) => r.textContent);
    expect(starters[0]).toMatch(/^QBJosh AllenQB · BUF308$/);
    expect(starters[1]).toMatch(/^RBEmpty/);
    expect(starters[2]).toMatch(/^FLEXBijan RobinsonRB · ATLQ/);
    expect(group("Bench").getByText("Dallas Cowboys")).toBeTruthy();
    expect(group("Bench").getByText("WR · FA")).toBeTruthy();
    expect(group("Bench").getByText("R")).toBeTruthy();
    expect(group("Taxi squad").getByText("Taxi Back")).toBeTruthy();
    expect(screen.queryByRole("region", { name: "Injured reserve" })).toBeNull();
  });

  it("drills to the manager's profile and the league in place", async () => {
    const navigate = vi.fn();
    inMember(
      <NavigateContext value={navigate}>
        <TeamWindow params={{ rosterId: 6 }} />
      </NavigateContext>,
    );
    fireEvent.click(await screen.findByRole("button", { name: "manager6" }));
    expect(navigate).toHaveBeenLastCalledWith({ kind: "profile", params: { userId: "u6" } });
    fireEvent.click(screen.getByRole("button", { name: "2nd of 3" }));
    expect(navigate).toHaveBeenLastCalledWith({ kind: "league", params: { leagueId: LEAGUE_ID } });
  });

  it("keeps the team up when player names fail, and retries them", async () => {
    let fail = true;
    routes["GET /players/list"] = () => (fail ? [500, { error: { message: "Internal server error" } }] : [200, { count: 5, players: PLAYERS }]);
    inMember(<TeamWindow params={{ rosterId: 4 }} />);

    expect((await screen.findByRole("alert")).textContent).toMatch(/player names: internal server error/i);
    expect(screen.getByRole("region", { name: "Team Name 4" })).toBeTruthy();
    fail = false;
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Josh Allen")).toBeTruthy();
  });

  it("says so when Sleeper fails, and retries", async () => {
    let fail = true;
    routes[`sleeper /league/${LEAGUE_ID}/rosters`] = () => (fail ? [503, {}] : [200, ROSTERS]);
    inMember(<TeamWindow params={{ rosterId: 4 }} />);

    expect((await screen.findByRole("alert")).textContent).toMatch(/couldn’t load the team from sleeper/i);
    fail = false;
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("region", { name: "Team Name 4" })).toBeTruthy();
  });

  it("names a roster the league doesn't have, and an empty roster", async () => {
    const { unmount } = inMember(<TeamWindow params={{ rosterId: 9 }} />);
    expect((await screen.findByRole("alert")).textContent).toBe("Charlotte Dynasty League has no roster 9.");
    unmount();
    inMember(<TeamWindow params={{ rosterId: 1 }} />);
    expect(await screen.findByText("No players on this roster yet.")).toBeTruthy();
  });

  it("opens a team in another league", async () => {
    Object.assign(routes, {
      ...sleeper(`/league/${OTHER}`, { ...LEAGUE, league_id: OTHER, name: "Other League", settings: {} }),
      ...sleeper(`/league/${OTHER}/users`, [user(2)]),
      ...sleeper(`/league/${OTHER}/rosters`, [roster(2, 0, 1)]),
    });
    inMember(<TeamWindow params={{ leagueId: OTHER, rosterId: 2 }} />);
    const head = within(await screen.findByRole("region", { name: "Team Name 2" }));
    expect(head.queryByRole("img", { name: "Your team" })).toBeNull();
  });
});

describe("My Team window", () => {
  it("opens the member's own roster", async () => {
    inMember(<MyTeamWindow />);
    expect(await screen.findByRole("region", { name: "Team Name 4" })).toBeTruthy();
  });

  it("prefers the account linked in Settings over the roster's mapping", async () => {
    routes["GET /clt/me"] = [200, { member: { email: "m@example.com", displayName: "", role: "member", sleeperUserId: "u4" }, linkedSleeperUserId: "u6" }];
    inMember(<MyTeamWindow />);
    expect(await screen.findByRole("region", { name: "Team Name 6" })).toBeTruthy();
  });

  it("asks an unlinked member to link Sleeper", async () => {
    routes["GET /clt/me"] = [200, { member: { email: "m@example.com", displayName: "", role: "member", sleeperUserId: "" }, linkedSleeperUserId: "" }];
    inMember(<MyTeamWindow />);
    expect(await screen.findByText(/link your sleeper account in settings/i)).toBeTruthy();
  });

  it("warns when the linked account owns no team", async () => {
    routes["GET /clt/me"] = [200, { member: { email: "m@example.com", displayName: "", role: "member", sleeperUserId: "" }, linkedSleeperUserId: "u99" }];
    inMember(<MyTeamWindow />);
    expect((await screen.findByRole("alert")).textContent).toMatch(/doesn’t own a team/);
  });
});

describe("after linking in Settings", () => {
  it("My Team finds the team without a reload", async () => {
    const unlinked = { email: "m@example.com", displayName: "", role: "member", sleeperUserId: "" };
    routes["GET /clt/me"] = [200, { member: unlinked, linkedSleeperUserId: "" }];
    const platform = { userId: "s", email: "m@example.com", sleeperUserId: "", sleeperUsername: "", sleeperAvatar: "", displayName: "", hasLinkedSleeper: false, createdAt: "", updatedAt: "" };
    routes["GET /me/profile"] = [200, { user: platform }];
    routes["PUT /me/sleeper-link"] = () => {
      routes["GET /clt/me"] = [200, { member: unlinked, linkedSleeperUserId: "u4" }];
      return [200, { user: { ...platform, sleeperUserId: "u4", sleeperUsername: "handle4", hasLinkedSleeper: true } }];
    };
    inMember(
      <AlertsProvider>
        <SettingsWindow />
        <MyTeamWindow />
      </AlertsProvider>,
    );
    expect(await screen.findByText(/link your sleeper account in settings so/i)).toBeTruthy();
    fireEvent.change(await screen.findByLabelText("Sleeper username"), { target: { value: "handle4" } });
    fireEvent.click(screen.getByRole("button", { name: "Link" }));
    expect(await screen.findByRole("region", { name: "Team Name 4" })).toBeTruthy();
  });
});

describe("Profile window", () => {
  beforeEach(() => {
    Object.assign(routes, {
      ...sleeper("/user/u6", { user_id: "u6", username: "handle6", display_name: "Manager6", avatar: null }),
      ...sleeper("/user/u6/leagues/nfl/2026", [LEAGUE, { ...LEAGUE, league_id: OTHER, name: "Other League", total_rosters: 10 }]),
    });
  });

  it("shows another manager's CLT team and other leagues", async () => {
    const navigate = vi.fn();
    inMember(
      <NavigateContext value={navigate}>
        <ProfileWindow params={{ userId: "u6" }} />
      </NavigateContext>,
    );
    expect(await screen.findByText("@handle6")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Team Name 6" }));
    expect(navigate).toHaveBeenLastCalledWith({ kind: "team", params: { rosterId: 6 } });
    fireEvent.click(screen.getByRole("button", { name: "Other League" }));
    expect(navigate).toHaveBeenLastCalledWith({ kind: "league", params: { leagueId: OTHER } });
    expect(screen.getByText("10 teams")).toBeTruthy();
  });

  it("says when Sleeper has no such user, or they have no other leagues", async () => {
    routes["sleeper /user/u404"] = [200, null];
    const { unmount } = inMember(<ProfileWindow params={{ userId: "u404" }} />);
    expect((await screen.findByRole("alert")).textContent).toBe("Sleeper has no user u404.");
    unmount();
    routes["sleeper /user/u6/leagues/nfl/2026"] = [200, [LEAGUE]];
    inMember(<ProfileWindow params={{ userId: "u6" }} />);
    expect(await screen.findByText("No other Sleeper leagues this season.")).toBeTruthy();
  });
});

describe("League window", () => {
  it("lists the teams by record with drills to each", async () => {
    const navigate = vi.fn();
    inMember(
      <NavigateContext value={navigate}>
        <LeagueWindow params={{ leagueId: LEAGUE_ID }} />
      </NavigateContext>,
    );
    await screen.findByRole("table");
    const rows = screen.getAllByRole("row").slice(1).map((r) => r.textContent);
    expect(rows).toEqual(["1TTeam Name 4SEC3-0304.50", "2TTeam Name 6SEC2-1306.50", "3TTeam Name 1BIG101-2301.50"]);
    fireEvent.click(screen.getByRole("button", { name: /Team Name 6/ }));
    expect(navigate).toHaveBeenLastCalledWith({ kind: "team", params: { rosterId: 6 } });
  });
});
