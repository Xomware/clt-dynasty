import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("aws-amplify/auth", () => ({
  fetchAuthSession: vi.fn(async () => ({ tokens: { idToken: { toString: () => "id-token" } } })),
}));

import { NavigateContext } from "@/lib/desktop/navigation";
import { MemberProvider } from "@/lib/member/use-member";
import { SLEEPER_WEB } from "@/lib/sleeper/client";
import { fixture, stubSleeper } from "@/lib/test/league-mock";
import { BuzzPlayer } from "./BuzzPlayer";

// Roster 1's week-1 QB. The fixture's rosters carry no players, so roster 1 gets him back.
const ID = fixture.matchups["1"].find((r) => r.roster_id === 1)!.starters![0];
const roster = { ...fixture.rosters.find((r) => r.roster_id === 1)!, players: [ID], starters: [ID] };
const ROSTERS = fixture.rosters.map((r) => (r.roster_id === 1 ? roster : r));

const PLAYER = {
  player_id: ID,
  first_name: "Test",
  last_name: "Starter",
  position: "WR",
  team: "LAC",
  number: 15,
  age: 25,
  height: "71",
  weight: "185",
  college: "Alabama",
  years_exp: 2,
  status: "Active",
  injury_status: "Questionable",
  injury_body_part: "Ankle",
  depth_chart_order: 1,
};

const line = (week: number, opponent: string, stats: Record<string, number>) => ({ week, team: "LAC", opponent, stats });
const STATS = {
  "1": line(1, "ARI", { rec: 6, rec_tgt: 9, rec_yd: 88, rec_td: 1, gp: 1 }),
  "2": line(2, "LV", { rec: 3, rec_tgt: 4, rec_yd: 31, gp: 1 }),
  "3": line(3, "BUF", { rec: 8, rec_tgt: 11, rec_yd: 120, gp: 1 }),
  "4": line(4, "SEA", { gp: 1 }),
  "5": null,
};
const game = (week: number, home: string, away: string, status = "complete") => ({ week, home, away, status });
const SCHEDULE = [
  game(1, "LAC", "ARI"),
  game(2, "LV", "LAC"),
  game(3, "LAC", "BUF"),
  game(4, "SEA", "LAC"),
  game(5, "KC", "DEN", "pre_game"),
  game(7, "KC", "DEN", "pre_game"),
  ...[5, 6].map((w) => game(w, "LAC", "MIA", "pre_game")),
];

const statsUrl = `${SLEEPER_WEB}/stats/nfl/player/${ID}?season_type=regular&season=2026&grouping=week`;
const routes = (extra: Record<string, unknown> = {}) => ({
  [`${SLEEPER_WEB}/players/nfl/${ID}`]: PLAYER,
  [statsUrl]: STATS,
  [`${SLEEPER_WEB}/schedule/nfl/regular/2026`]: SCHEDULE,
  [`/league/${fixture.league.league_id}/rosters`]: ROSTERS,
  ...extra,
});

const navigate = vi.fn();
beforeEach(() => navigate.mockReset());
afterEach(() => vi.restoreAllMocks());

const open = (playerId = ID) =>
  render(
    <MemberProvider>
      <NavigateContext value={navigate}>
        <BuzzPlayer params={{ playerId }} />
      </NavigateContext>
    </MemberProvider>,
  );

describe("Buzz City player card", () => {
  it("deals the front face up, then flips to the stats and back", async () => {
    stubSleeper(routes());
    open();
    const front = await screen.findByRole("region", { name: "Test Starter, front of card" });
    expect(within(front).getByRole("heading", { name: /Test\s+Starter/ })).toBeTruthy();
    expect(within(front).getByText("Los Angeles Chargers")).toBeTruthy();
    expect(screen.queryByRole("region", { name: "Test Starter, back of card" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Flip for stats" }));
    const back = screen.getByRole("region", { name: "Test Starter, back of card" });
    expect(screen.queryByRole("region", { name: "Test Starter, front of card" })).toBeNull();
    const bio = within(back).getByText("College").parentElement!;
    expect(bio.textContent).toBe("CollegeAlabama");
    expect(within(back).getByRole("table", { name: /2026/ })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Show the front" }));
    expect(screen.getByRole("button", { name: "Flip for stats" }).getAttribute("aria-pressed")).toBe("false");
  });

  it("opens the NFL team from the card and keeps the CLT roster spot beside it", async () => {
    stubSleeper(routes());
    open();
    fireEvent.click(await screen.findByRole("button", { name: /Los Angeles Chargers/ }));
    expect(navigate).toHaveBeenLastCalledWith({ kind: "nfl", params: { team: "LAC" } });
    expect(await screen.findByRole("region", { name: "In the CLT Dynasty League" })).toBeTruthy();
  });
});
