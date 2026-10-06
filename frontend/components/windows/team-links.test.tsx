import { fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fixture } from "@/lib/test/league-mock";

vi.mock("aws-amplify/auth", () => ({
  fetchAuthSession: vi.fn(async () => ({ tokens: { idToken: { toString: () => "id-token" } } })),
}));
vi.mock("@/lib/api/clt", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/clt")>()),
  getCltMe: vi.fn(async () => ({
    member: { email: "member@example.com", displayName: "Roster 4", role: "member", sleeperUserId: "" },
    linkedSleeperUserId: "u4",
  })),
}));

import { API_BASE, LEAGUE_ID } from "@/lib/config";
import { NavigateContext } from "@/lib/desktop/navigation";
import { MemberProvider } from "@/lib/member/use-member";
import { stubSleeper } from "@/lib/test/league-mock";
import { HistoryWindow } from "./HistoryWindow";
import { HomeWindow } from "./HomeWindow";
import { ScoresWindow } from "./ScoresWindow";
import { StandingsWindow } from "./StandingsWindow";

const navigate = vi.fn();
beforeEach(() => {
  navigate.mockReset();
  stubSleeper({ [`${API_BASE}/announcements/list`]: { Success: true, count: 0, rows: [] } });
});
afterEach(() => {
  vi.restoreAllMocks();
});

const open = (ui: ReactNode) =>
  render(
    <MemberProvider>
      <NavigateContext value={navigate}>{ui}</NavigateContext>
    </MemberProvider>,
  );

describe("team names open Team Profile", () => {
  it("from Standings", async () => {
    open(<StandingsWindow params={{}} />);
    const table = await screen.findByRole("table", { name: "League standings" });
    fireEvent.click(within(table).getByRole("button", { name: /^T?Team 2$/ }));
    expect(navigate).toHaveBeenLastCalledWith({ kind: "team", params: { rosterId: 2 } });
  });

  it("from a past season in History, in that season's league", async () => {
    open(<HistoryWindow params={{}} />);
    const list = await screen.findByRole("list", { name: "Champions by season" });
    const last = within(list).getAllByRole("listitem")[1];
    fireEvent.click(within(last).getAllByRole("button")[0]);
    const [call] = navigate.mock.calls.at(-1)!;
    expect(call.kind).toBe("team");
    expect(call.params.rosterId).toBe(10);
    expect(call.params.leagueId).not.toBe(LEAGUE_ID);
  });

  it("Home's draft card opens Draft History", async () => {
    stubSleeper({
      [`${API_BASE}/announcements/list`]: { Success: true, count: 0, rows: [] },
      [`/league/${LEAGUE_ID}/drafts`]: [{ draft_id: "9", season: "2027", status: "pre_draft", type: "linear", start_time: null }],
    });
    open(<HomeWindow />);
    fireEvent.click(await screen.findByRole("button", { name: "2027 Rookie Draft" }));
    expect(navigate).toHaveBeenLastCalledWith({ kind: "drafts", params: {} });
  });
});

describe("players open the Player window", () => {
  it("from a Scores lineup, with his NFL team beside him", async () => {
    open(<ScoresWindow />);
    const [game] = await screen.findAllByRole("region", { name: /^Matchup / });
    fireEvent.click(within(game).getByRole("button", { name: /Show lineups/ }));
    const [starters] = await within(game).findAllByRole("list", { name: /starters$/ });
    const rosterId = Number(/Team (\d+)/.exec(starters.getAttribute("aria-label")!)![1]);
    const first = fixture.matchups["4"].find((m) => m.roster_id === rosterId)!.starters![0];
    const row = (await within(starters).findAllByRole("listitem"))[0];
    const [name, team] = within(row).getAllByRole("button");
    fireEvent.click(name);
    expect(navigate).toHaveBeenLastCalledWith({ kind: "player", params: { playerId: first } });
    fireEvent.click(team);
    expect(navigate.mock.lastCall?.[0].kind).toBe("nfl");
  });
});
