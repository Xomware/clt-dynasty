import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("aws-amplify/auth", () => ({
  fetchAuthSession: vi.fn(async () => ({ tokens: { idToken: { toString: () => "id-token" } } })),
}));

import { fixture, stubSleeper } from "@/lib/test/league-mock";
import { DraftOrderWindow } from "./DraftOrderWindow";

const league = `/league/${fixture.league.league_id}`;
const teams = (table: HTMLElement) =>
  within(table)
    .getAllByRole("row")
    .slice(1)
    .map((r) => r.querySelector(".xp-team-name")?.textContent);

beforeEach(() => {
  stubSleeper();
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("Draft Order", () => {
  it("projects next year's order by the rulebook, noting traded firsts", async () => {
    stubSleeper({ [`${league}/traded_picks`]: [{ season: "2027", round: 1, roster_id: 1, previous_owner_id: 1, owner_id: 9 }] });
    render(<DraftOrderWindow params={{}} />);
    const table = await screen.findByRole("table", { name: "2027 draft order by the rulebook" });
    expect(teams(table)).toEqual(["Team 1", "Team 6", "Team 9", "Team 10", "Team 8", "Team 3", "Team 11", "Team 7", "Team 12", "Team 5", "Team 4", "Team 2"]);
    expect(within(table).getAllByRole("row")[1].textContent).toContain("1st-round pick held by Team 9");
    expect(screen.getByText(/Projected 2027 rookie draft order/)).toBeTruthy();
  });

  it("ranks the non-playoff teams by HPP under proposal 57", async () => {
    render(<DraftOrderWindow params={{ tab: "hpp" }} />);
    const table = await screen.findByRole("table", { name: "2027 draft order under proposal 57" });
    const hpp = within(table)
      .getAllByRole("row")
      .slice(1, 7)
      .map((r) => Number(within(r).getAllByRole("cell").at(-1)?.textContent));
    expect(hpp).toEqual([...hpp].sort((a, b) => a - b));
    expect(hpp.every((h) => h > 0)).toBe(true);
  });

  it("explains HPP before any week has finished", async () => {
    stubSleeper({ "/state/nfl": { ...fixture.state, week: 1 } });
    render(<DraftOrderWindow params={{}} />);
    await screen.findByRole("table");
    fireEvent.click(screen.getByRole("tab", { name: "Proposal #57" }));
    await waitFor(() => expect(screen.getByText(/No regular-season week has finished yet/)).toBeTruthy());
  });

  it("says when Sleeper is down", async () => {
    stubSleeper({ [`${league}/traded_picks`]: () => new Response("down", { status: 503 }) });
    render(<DraftOrderWindow params={{}} />);
    expect((await screen.findByRole("alert")).textContent).toMatch(/503/);
  });
});
