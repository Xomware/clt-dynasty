import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("aws-amplify/auth", () => ({
  fetchAuthSession: vi.fn(async () => ({ tokens: { idToken: { toString: () => "id-token" } } })),
}));

import { LEAGUE_ID } from "@/lib/config";
import { MemberProvider } from "@/lib/member/use-member";
import { AnalyzerWindow } from "./AnalyzerWindow";

const roster = (roster_id: number, players: string[], starters: string[]) => ({
  roster_id,
  owner_id: `u${roster_id}`,
  co_owners: null,
  starters,
  players,
  taxi: null,
  reserve: null,
  settings: { wins: 0, losses: 0, ties: 0 },
  metadata: null,
});

const VALUES = [
  { player: { sleeperId: "1", position: "QB", name: "A" }, value: 8000 },
  { player: { sleeperId: "2", position: "WR", name: "B" }, value: 6000 },
  { player: { sleeperId: "3", position: "RB", name: "C" }, value: 1000 },
];

let routes: Record<string, [number, unknown]>;

beforeEach(() => {
  routes = {
    "/clt/me": [200, { member: { email: "m@example.com", displayName: "Roster 4", role: "member", sleeperUserId: "u4" }, linkedSleeperUserId: "" }],
    "/players/list": [200, { count: 0, players: {} }],
    [`/v1/league/${LEAGUE_ID}`]: [200, { league_id: LEAGUE_ID, name: "CLT", roster_positions: [], settings: {}, metadata: null }],
    [`/v1/league/${LEAGUE_ID}/users`]: [200, [4, 6].map((n) => ({ user_id: `u${n}`, display_name: `manager${n}`, avatar: null, metadata: { team_name: `Team Name ${n}` } }))],
    [`/v1/league/${LEAGUE_ID}/rosters`]: [200, [roster(4, ["3"], ["3"]), roster(6, ["1", "2"], ["1", "2"])]],
    "/values/current": [200, VALUES],
  };
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const hit = routes[new URL(String(input)).pathname];
    if (!hit) throw new Error(`unmocked ${String(input)}`);
    return new Response(JSON.stringify(hit[1]), { status: hit[0] });
  });
});
afterEach(() => {
  vi.restoreAllMocks();
});

const renderAnalyzer = () =>
  render(
    <MemberProvider>
      <AnalyzerWindow params={{}} />
    </MemberProvider>,
  );
const rowOf = (table: HTMLElement, name: string) => within(table).getByRole("rowheader", { name }).closest("tr")!;

describe("Team Analyzer", () => {
  it("compares the member's team with the league average, then with a picked team", async () => {
    renderAnalyzer();
    expect((await screen.findByLabelText("Team")) as HTMLSelectElement).toHaveProperty("value", "4");
    const table = screen.getByRole("table", { name: "Value by position group" });
    expect(rowOf(table, "RB").textContent).toBe("RB1,000, above the league average500");
    expect(rowOf(table, "QB").textContent).toBe("QB0, well below the league average4,000");
    expect(screen.getByRole("img").getAttribute("aria-label")).toBe("Team Name 4's roster value by position group, with the league average");

    fireEvent.change(screen.getByLabelText("Compare against"), { target: { value: "6" } });
    expect(within(table).getByRole("columnheader", { name: "Them" })).toBeTruthy();
    expect(rowOf(table, "WR").textContent).toBe("WR0, well below the league average6,000");
  });

  it("ranks the league by total value", async () => {
    renderAnalyzer();
    fireEvent.click(await screen.findByRole("tab", { name: "League" }));
    const rows = within(screen.getByRole("table", { name: "Teams ranked by total roster value" })).getAllByRole("row").slice(1);
    expect(rows.map((r) => within(r).getByRole("button").textContent)).toEqual(["Team Name 6", "Team Name 4"]);
    expect(rows[1].textContent).toMatch(/\(your team\)/);
    expect(within(screen.getByLabelText("League averages")).getByText("7,500")).toBeTruthy();
  });

  it("says when FantasyCalc fails and retries it", async () => {
    routes["/values/current"] = [503, {}];
    renderAnalyzer();
    expect((await screen.findByRole("alert")).textContent).toMatch(/FantasyCalc values: FantasyCalc failed \(503\)/);
    routes["/values/current"] = [200, VALUES];
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("tab", { name: "Compare" })).toBeTruthy();
  });
});
