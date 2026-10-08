import { fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("aws-amplify/auth", () => ({
  fetchAuthSession: vi.fn(async () => ({ tokens: { idToken: { toString: () => "id-token" } } })),
}));

import { API_BASE } from "@/lib/config";
import { parseOpen } from "@/lib/desktop/deep-link";
import { NavigateContext } from "@/lib/desktop/navigation";
import { windowTitle } from "@/lib/desktop/registry";
import { MemberProvider } from "@/lib/member/use-member";
import { fixture, stubSleeper } from "@/lib/test/league-mock";
import { NflTeamsWindow, NflTeamWindow } from "./NflTeamWindow";

const p = (player_id: string, first_name: string, position: string, depth_chart_order?: number, extra = {}) => ({
  player_id,
  first_name,
  last_name: "Charger",
  position,
  team: "LAC",
  depth_chart_order,
  ...extra,
});
const PLAYERS = {
  "1": p("1", "Justin", "QB", 1),
  "2": p("2", "Trey", "QB", 2),
  "3": p("3", "Ladd", "WR", 1, { injury_status: "Out", depth_chart_position: "SWR", number: 15 }),
  "6": p("6", "Quentin", "WR", 2, { injury_status: "Questionable", injury_body_part: "Chest", depth_chart_position: "LWR" }),
  "7": p("7", "Marquez", "WR", 4, { depth_chart_position: "LWR" }),
  "4": p("4", "Practice", "WR", undefined),
  "5": { player_id: "5", first_name: "Josh", last_name: "Allen", position: "QB", team: "BUF", depth_chart_order: 1 },
};
const ROSTERS = fixture.rosters.map((r) => (r.roster_id === 3 ? { ...r, players: ["3"] } : r));

const navigate = vi.fn();
beforeEach(() => {
  navigate.mockReset();
  stubSleeper({
    [`${API_BASE}/players/list`]: { count: 5, players: PLAYERS },
    [`/league/${fixture.league.league_id}/rosters`]: ROSTERS,
    "https://api.sleeper.com/schedule/nfl/regular/2026": [{ week: 1, home: "KC", away: "DEN", status: "complete" }],
  });
});
afterEach(() => vi.restoreAllMocks());

const open = (ui: ReactNode) =>
  render(
    <MemberProvider>
      <NavigateContext value={navigate}>{ui}</NavigateContext>
    </MemberProvider>,
  );

describe("NFL Team window", () => {
  it("lists the roster in chart order, off-chart players after the charted at each position", async () => {
    open(<NflTeamWindow params={{ team: "LAC", tab: "roster" }} />);
    const table = await screen.findByRole("table");
    const rows = within(table).getAllByRole("row").slice(1);
    expect(rows.map((r) => within(r).getAllByRole("cell")[0].textContent)).toEqual(["QB1", "QB2", "WR1", "WR2", "WR3", "WR off the chart"]);
    expect(rows.map((r) => within(r).getByRole("button", { name: /Charger/ }).textContent)).toEqual([
      "Justin Charger",
      "Trey Charger",
      "Ladd Charger",
      "Quentin Charger",
      "Marquez Charger",
      "Practice Charger",
    ]);
    expect(within(rows[2]).getByText("Out", { selector: ".sr-only" })).toBeTruthy();
    expect(rows[2].hasAttribute("data-sidelined")).toBe(true);
    expect(screen.queryByText("Josh Allen")).toBeNull();
    expect(screen.getByText(/bye in week 1/)).toBeTruthy();
  });

  it("sorts by a column header, and opens a player and the CLT team that owns him", async () => {
    open(<NflTeamWindow params={{ team: "LAC", tab: "roster" }} />);
    const table = await screen.findByRole("table");
    const sortBy = within(table).getByRole("button", { name: "Player" });
    fireEvent.click(sortBy);
    expect(sortBy.closest("th")?.getAttribute("aria-sort")).toBe("ascending");
    expect(within(table).getAllByRole("row")[1].textContent).toContain("Justin Charger");
    fireEvent.click(sortBy);
    expect(sortBy.closest("th")?.getAttribute("aria-sort")).toBe("descending");
    expect(within(table).getAllByRole("row")[1].textContent).toContain("Trey Charger");

    fireEvent.click(within(table).getByRole("button", { name: "Ladd Charger" }));
    expect(navigate).toHaveBeenLastCalledWith({ kind: "player", params: { playerId: "3" } });
    fireEvent.click(within(table).getByRole("button", { name: "Team 3" }));
    expect(navigate).toHaveBeenLastCalledWith({ kind: "team", params: { rosterId: 3 } });
    expect(within(table).getAllByText("Free agent")).toHaveLength(5);
  });

  it("reads its link and names itself", () => {
    expect(parseOpen("?open=nfl:LAC,nfl:XYZ,nfl:lac")).toEqual([{ kind: "nfl", params: { team: "LAC" } }]);
    expect(windowTitle({ kind: "nfl", params: { team: "BAL" } })).toBe("Baltimore Ravens");
  });
});

describe("NFL Team field", () => {
  it("lines the depth chart up on the field, starters first, injured players marked", async () => {
    open(<NflTeamWindow params={{ team: "LAC" }} />);
    const field = await screen.findByRole("region", { name: "Los Angeles Chargers depth chart" });
    expect(screen.getByRole("tab", { name: "Depth chart", selected: true })).toBeTruthy();
    const qb = within(field).getByRole("button", { name: /^Quarterback, starter: Justin Charger/ });
    expect(qb.getAttribute("aria-label")).toBe("Quarterback, starter: Justin Charger, free agent");
    const slot = within(field).getByRole("button", { name: /^Slot receiver, starter/ });
    expect(slot.getAttribute("aria-label")).toBe("Slot receiver, starter: Ladd Charger, #15, Out, on Team 3");
    expect(slot.querySelector("[data-sidelined]")).toBeTruthy();
    const x = within(field).getByRole("button", { name: /^X receiver, starter/ });
    expect(x.getAttribute("aria-label")).toContain("Quentin Charger, Questionable: Chest");
    expect(x.querySelector("[data-injured]")).toBeTruthy();
    expect(x.querySelector("[data-sidelined]")).toBeNull();
    expect(within(field).getByRole("img", { name: "Offensive line: Sleeper doesn't chart linemen" })).toBeTruthy();
    // The 2nd string reads under the starter without a tap.
    expect(within(field).getAllByText("Charger", { selector: ".nfl-depth li", exact: false }).map((li) => li.textContent)).toEqual(["2 Charger", "2 Charger"]);
    // Off the chart, so not on the field.
    expect(within(field).queryByRole("button", { name: /Practice/ })).toBeNull();
    expect(within(screen.getByRole("region", { name: "Injury designations" })).getByText("Injured reserve", { selector: "dd" })).toBeTruthy();
  });

  it("expands a spot's backups and opens any player", async () => {
    open(<NflTeamWindow params={{ team: "LAC" }} />);
    const field = await screen.findByRole("region", { name: "Los Angeles Chargers depth chart" });
    const more = within(field).getByRole("button", { name: "Quarterback backups, 1" });
    expect(more.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(more);
    const list = within(field).getByRole("list", { name: "Quarterback backups" });
    fireEvent.click(within(list).getByRole("button", { name: /^Quarterback, 2nd string: Trey Charger/ }));
    expect(navigate).toHaveBeenLastCalledWith({ kind: "player", params: { playerId: "2" } });
    fireEvent.keyDown(more, { key: "Escape" });
    expect(within(field).queryByRole("list", { name: "Quarterback backups" })).toBeNull();
  });
});

describe("NFL Teams index", () => {
  it("files 32 teams in 8 divisions, each opening its depth chart", () => {
    open(<NflTeamsWindow />);
    expect(screen.getAllByRole("region")).toHaveLength(8);
    expect(screen.getAllByRole("button")).toHaveLength(32);
    fireEvent.click(within(screen.getByRole("region", { name: "AFC North" })).getByRole("button", { name: "Baltimore Ravens" }));
    expect(navigate).toHaveBeenLastCalledWith({ kind: "nfl", params: { team: "BAL" } });
  });
});
