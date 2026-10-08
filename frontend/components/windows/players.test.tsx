import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("aws-amplify/auth", () => ({
  fetchAuthSession: vi.fn(async () => ({ tokens: { idToken: { toString: () => "id-token" } } })),
}));
vi.mock("@/lib/api/clt", () => ({
  getCltMe: vi.fn(async () => ({
    member: { email: "member@example.com", displayName: "Roster 4", role: "member", sleeperUserId: "" },
    linkedSleeperUserId: "u4",
  })),
}));

import { API_BASE } from "@/lib/config";
import { MemberProvider } from "@/lib/member/use-member";
import { fixture, stubSleeper } from "@/lib/test/league-mock";
import { ViewParamsContext } from "@/lib/view-params";
import { PlayersWindow } from "./PlayersWindow";

const player = (player_id: string, first_name: string, last_name: string, position: string, team: string | undefined, extra = {}) => ({
  player_id,
  first_name,
  last_name,
  position,
  team,
  ...extra,
});
const PLAYERS = {
  "10": player("10", "Bryce", "Young", "QB", "CAR", { age: 25, years_exp: 3 }),
  "11": player("11", "Chuba", "Hubbard", "RB", "CAR", { age: 27, years_exp: 5 }),
  "12": player("12", "Tetairoa", "McMillan", "WR", "CAR", { age: 22, years_exp: 0 }),
  "13": player("13", "Ja'Tavion", "Sanders", "TE", "CAR", { age: 23, years_exp: 1, injury_status: "Questionable" }),
  "14": player("14", "Free", "Agent", "RB", undefined, { age: 30, years_exp: 8 }),
};
// Roster 4 (mine) has Young and Hubbard; roster 9 has McMillan on taxi.
const ROSTERS = fixture.rosters.map((r) =>
  r.roster_id === 4 ? { ...r, players: ["10", "11"], starters: ["10", "11"] } : r.roster_id === 9 ? { ...r, players: ["12"], taxi: ["12"] } : { ...r, players: [] },
);
const row = (player_id: string, position: string, stats: Record<string, number>) => ({ player_id, stats, player: { position } });
// CLT scoring: 0.04 per pass yard, 4 per pass TD, 0.1 per rush/rec yard, 1 per catch.
const SEASON = [row("10", "QB", { pass_yd: 1000, pass_td: 6, gp: 4 }), row("11", "RB", { rush_yd: 300, gp: 3 }), row("12", "WR", { rec: 20, rec_yd: 250, gp: 4 })];
const PROJ = [row("10", "QB", { pass_yd: 250, pass_td: 2 }), row("12", "WR", { rec: 5, rec_yd: 60 }), row("14", "RB", { rush_yd: 70 })];

const setParams = vi.fn();
beforeEach(() => {
  const base = stubSleeper({
    [`${API_BASE}/players/list`]: { count: 5, players: PLAYERS },
    [`/league/${fixture.league.league_id}/rosters`]: ROSTERS,
  }).getMockImplementation();
  vi.mocked(fetch).mockImplementation(async (input, init) => {
    const url = String(input);
    const json = (body: unknown) => new Response(JSON.stringify(body));
    if (url.includes("api.sleeper.com/stats/nfl/2026?")) return json(SEASON);
    if (url.includes("api.sleeper.com/projections/nfl/2026/4?")) return json(PROJ);
    if (url.includes("api.sleeper.com/schedule/")) return json([]);
    if (url.includes("fantasycalc")) return json([{ player: { sleeperId: "12", position: "WR", name: "TMac" }, value: 6100 }]);
    return base!(input, init);
  });
});
afterEach(() => {
  vi.restoreAllMocks();
  setParams.mockReset();
});

const open = (v = "") =>
  render(
    <MemberProvider>
      <ViewParamsContext value={setParams}>
        <PlayersWindow params={v ? { v } : {}} />
      </ViewParamsContext>
    </MemberProvider>,
  );

const table = async () => {
  const t = await screen.findByRole("table", { name: /^Players, sorted by/ });
  await within(t).findByText("Tetairoa McMillan");
  return t;
};
const names = (t: HTMLElement) => within(t).getAllByRole("row").slice(1).map((r) => within(r).getAllByRole("button")[0].textContent);

describe("Players window", () => {
  it("lists every player by season points in CLT scoring, with owner, roster spot and projection", async () => {
    open();
    const t = await table();
    expect(names(t)).toEqual(["Bryce Young", "Tetairoa McMillan", "Chuba Hubbard", "Ja'Tavion Sanders", "Free Agent"]);
    const young = within(t).getByText("Bryce Young").closest("tr") as HTMLElement;
    // 1000 * 0.04 + 6 * 4 = 64 over 4 games; this week 250 * 0.04 + 2 * 4 = 18.
    expect(within(young).getByText("64.0")).toBeTruthy();
    expect(within(young).getByText("16.0")).toBeTruthy();
    expect(within(young).getByText("18.0")).toBeTruthy();
    expect(young.hasAttribute("data-mine")).toBe(true);
    const tmac = within(t).getByText("Tetairoa McMillan").closest("tr") as HTMLElement;
    expect(within(tmac).getByText("Taxi")).toBeTruthy();
    expect(within(tmac).getByText("Rookie")).toBeTruthy();
    expect(within(tmac).getByText("6,100")).toBeTruthy();
    expect(within(within(t).getByText("Free Agent").closest("tr") as HTMLElement).getByText("Available")).toBeTruthy();
  });

  it("filters to available players at a position and keeps the view in the window's link", async () => {
    open();
    const t = await table();
    fireEvent.change(screen.getByLabelText("CLT team"), { target: { value: "available" } });
    fireEvent.click(screen.getByRole("button", { name: "RB", pressed: false }));
    expect(names(t)).toEqual(["Free Agent"]);
    expect(setParams).toHaveBeenLastCalledWith({ v: "pos-RB~own-available" });
    fireEvent.change(screen.getByLabelText("CLT team"), { target: { value: "mine" } });
    expect(names(t)).toEqual(["Chuba Hubbard"]);
  });

  it("searches by name and sorts by a column header, flipping on a second click", async () => {
    open();
    const t = await table();
    fireEvent.change(screen.getByRole("searchbox", { name: "Search players" }), { target: { value: "jatavion" } });
    expect(await within(t).findByText("Ja'Tavion Sanders")).toBeTruthy();
    expect(names(t)).toEqual(["Ja'Tavion Sanders"]);
    fireEvent.change(screen.getByRole("searchbox", { name: "Search players" }), { target: { value: "" } });
    fireEvent.click(within(t).getByRole("button", { name: /^Age, sort by Age/ }));
    expect(names(t)[0]).toBe("Tetairoa McMillan");
    fireEvent.click(within(t).getByRole("button", { name: /^Age/ }));
    expect(names(t)[0]).toBe("Free Agent");
  });

  it("rates every player not on my team and filters to the free agents worth adding", async () => {
    open();
    const t = await table();
    const cell = (name: string) => (within(t).getByText(name).closest("tr") as HTMLElement).querySelector(".pl-col-worth") as HTMLElement;
    // 70 rush yards is 7.0 points, all of it over my RB2, who has no projection.
    await within(t).findAllByText("Starter upgrade");
    expect(cell("Free Agent").textContent).toBe("Starter upgrade+7.0 pts this week at RB");
    expect(cell("Tetairoa McMillan").textContent).toMatch(/^Starter upgrade\+11\.0 pts this week at /);
    expect(cell("Ja'Tavion Sanders").textContent).toBe("Not worth it");
    expect(cell("Bryce Young").textContent).toBe("");
    fireEvent.click(screen.getByRole("checkbox", { name: "Only free agents worth adding to my team" }));
    expect(names(t)).toEqual(["Free Agent"]);
    expect(setParams).toHaveBeenLastCalledWith({ v: "wa-1" });
  });

  it("restores a linked view", async () => {
    open("pos-QB.TE~sort-age");
    const t = await screen.findByRole("table", { name: /^Players, sorted by Age/ });
    await within(t).findByText("Bryce Young");
    expect(names(t)).toEqual(["Ja'Tavion Sanders", "Bryce Young"]);
    expect(screen.getByRole("button", { name: "QB", pressed: true })).toBeTruthy();
  });
});
