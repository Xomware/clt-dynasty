import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("aws-amplify/auth", () => ({
  fetchAuthSession: vi.fn(async () => ({ tokens: { idToken: { toString: () => "id-token" } } })),
}));
vi.mock("@/lib/api/clt", () => ({
  getCltMe: vi.fn(async () => ({
    member: { email: "member@example.com", displayName: "Roster 4", role: "member", sleeperUserId: "u12" },
    linkedSleeperUserId: "u4",
  })),
}));

import { MemberProvider } from "@/lib/member/use-member";
import { calls, fixture, stubSleeper } from "@/lib/test/league-mock";
import { ScoresWindow } from "./ScoresWindow";
import { StandingsWindow } from "./StandingsWindow";

beforeEach(() => {
  stubSleeper();
});
afterEach(() => {
  vi.restoreAllMocks();
});

const withMember = (ui: ReactNode) => render(<MemberProvider>{ui}</MemberProvider>);
// The avatar's initial is decoration; read the team cell by its name.
const cells = (row: HTMLElement) =>
  within(row)
    .getAllByRole("cell")
    .map((c) => (c.querySelector(".xp-team-name") ?? c).textContent);

describe("Standings", () => {
  it("lists the league by record with streaks, points and playoff seeds", async () => {
    withMember(<StandingsWindow params={{}} />);
    const table = await screen.findByRole("table", { name: "League standings" });
    const rows = within(table).getAllByRole("row").slice(1);

    expect(rows.map((r) => cells(r)[1])).toEqual(
      [2, 4, 12, 5, 7, 11, 3, 8, 10, 9, 6, 1].map((id) => `Team ${id}`),
    );
    expect(cells(rows[0])).toEqual(["1", "Team 2", "3-0", "W3", "524.02", "410.30", "1"]);
    // Third on record but the third seed is division winner 5, so 12 is seed 4.
    expect(cells(rows[2]).at(-1)).toBe("4");
    expect(cells(rows[3]).at(-1)).toBe("3");
    expect(cells(rows[6]).at(-1)).toBe("");
  });

  it("stars the member's linked team", async () => {
    withMember(<StandingsWindow params={{}} />);
    const table = await screen.findByRole("table", { name: "League standings" });
    await waitFor(() => expect(within(table).getByRole("img", { name: "Your team" }).closest("tr")?.textContent).toContain("Team 4"));
  });

  it("splits the table by division", async () => {
    withMember(<StandingsWindow params={{ tab: "divisions" }} />);
    await screen.findByRole("heading", { name: "BIG10" });
    expect(screen.getAllByRole("table").map((t) => t.querySelector("caption")?.textContent)).toEqual([
      "BIG10 standings",
      "SEC standings",
      "ACC standings",
    ]);
    const acc = screen.getByRole("table", { name: "ACC standings" });
    expect(within(acc).getAllByRole("row").slice(1).map((r) => cells(r)[1])).toEqual(["Team 2", "Team 12", "Team 3", "Team 6"]);
  });

  it("says when Sleeper is down", async () => {
    vi.mocked(fetch).mockImplementation(async () => new Response("down", { status: 503 }));
    withMember(<StandingsWindow params={{}} />);
    expect((await screen.findByRole("alert")).textContent).toMatch(/Couldn.t reach Sleeper .*503/);
  });

  it("says when the league has no teams yet", async () => {
    stubSleeper({ [`/league/${fixture.league.league_id}/rosters`]: [] });
    withMember(<StandingsWindow params={{}} />);
    expect(await screen.findByText("No teams in the league yet.")).toBeTruthy();
  });
});

describe("Scores", () => {
  it("opens on the live week once it has points, with every game", async () => {
    withMember(<ScoresWindow />);
    await waitFor(() => expect(screen.getAllByRole("region", { name: /^Matchup / })).toHaveLength(6));
    expect((screen.getByLabelText("Week") as HTMLSelectElement).value).toBe("4");
    expect(screen.getByRole("button", { name: "Next week" })).toHaveProperty("disabled", true);
  });

  it("stays on last week until somebody scores in the new one", async () => {
    const zeroed = fixture.matchups["4"].map((m) => ({ ...m, points: 0 }));
    stubSleeper({ [`/league/${fixture.league.league_id}/matchups/4`]: zeroed });
    withMember(<ScoresWindow />);
    await waitFor(() => expect((screen.getByLabelText("Week") as HTMLSelectElement).value).toBe("3"));
  });

  it("steps back a week and shows both lineups by player name", async () => {
    withMember(<ScoresWindow />);
    await screen.findAllByRole("region", { name: /^Matchup / });
    fireEvent.click(screen.getByRole("button", { name: "Previous week" }));

    const game = await screen.findByRole("region", { name: "Matchup 3" });
    expect(within(game).getByRole("button").textContent).toMatch(/Team 2.*173\.44.*Team 12.*158\.68/);
    fireEvent.click(within(game).getByRole("button", { name: /Show lineups/ }));

    const starters = await within(game).findByRole("list", { name: "Team 2 starters" });
    await waitFor(() => expect(within(starters).getAllByRole("listitem")[0].textContent).toMatch(/^QBTrevor Lawrence/));
    expect(within(starters).getAllByRole("listitem")).toHaveLength(9);
    expect(calls("/players/list")).toBe(1);
  });

  it("still shows lineups by id when the player list fails", async () => {
    stubSleeper({ "https://api.xomper.xomware.com/players/list": () => new Response("{}", { status: 500 }) });
    withMember(<ScoresWindow />);
    const [game] = await screen.findAllByRole("region", { name: /^Matchup / });
    fireEvent.click(within(game).getByRole("button", { name: /Show lineups/ }));
    expect((await within(game).findAllByRole("alert"))[0].textContent).toMatch(/Sleeper ids/);
  });

  it("says when Sleeper is down", async () => {
    vi.mocked(fetch).mockImplementation(async () => new Response("down", { status: 503 }));
    withMember(<ScoresWindow />);
    expect((await screen.findByRole("alert")).textContent).toMatch(/503/);
  });
});
