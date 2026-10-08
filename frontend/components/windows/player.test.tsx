import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("aws-amplify/auth", () => ({
  fetchAuthSession: vi.fn(async () => ({ tokens: { idToken: { toString: () => "id-token" } } })),
}));

import { parseOpen } from "@/lib/desktop/deep-link";
import { NavigateContext } from "@/lib/desktop/navigation";
import { windowTitle } from "@/lib/desktop/registry";
import { MemberProvider } from "@/lib/member/use-member";
import { fantasyWeek } from "@/lib/player/season";
import { SLEEPER_WEB } from "@/lib/sleeper/client";
import { clearSharedResources } from "@/lib/shared-resource";
import { fixture, stubSleeper } from "@/lib/test/league-mock";
import { PlayerWindow } from "./PlayerWindow";

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
afterEach(() => {
  vi.restoreAllMocks();
  clearSharedResources();
});

const open = (playerId = ID) =>
  render(
    <MemberProvider>
      <NavigateContext value={navigate}>
        <PlayerWindow params={{ playerId }} />
      </NavigateContext>
    </MemberProvider>,
  );

describe("Player window", () => {
  it("shows the bio, the NFL team and the bye", async () => {
    stubSleeper(routes());
    open();
    expect(await screen.findByRole("heading", { name: /Test Starter/ })).toBeTruthy();
    expect(screen.getByText("Los Angeles Chargers")).toBeTruthy();
    expect(screen.getByText(", Questionable, Ankle")).toBeTruthy();
    const bio = screen.getByLabelText("Bio");
    expect(within(bio).getByText(`5'11"`)).toBeTruthy();
    expect(within(bio).getByText("185 lb")).toBeTruthy();
    expect(within(bio).getByText("WR1")).toBeTruthy();
    expect(within(bio).getByText("Week 7")).toBeTruthy();
  });

  it("totals his CLT points from the league's matchups and opens his team", async () => {
    stubSleeper(routes());
    open();
    const weeks = ["1", "2", "3", "4"].map((w) => fantasyWeek(fixture.matchups[w], ID));
    const total = weeks.reduce((sum, w) => sum + (w?.points ?? 0), 0);
    const clt = await screen.findByRole("region", { name: "In the CLT Dynasty League" });
    expect(within(clt).getByText(total.toFixed(2))).toBeTruthy();
    expect(within(clt).getByText("Starter")).toBeTruthy();

    fireEvent.click(within(clt).getByRole("button", { name: `Team ${roster.roster_id}` }));
    expect(navigate).toHaveBeenLastCalledWith({ kind: "team", params: { rosterId: roster.roster_id } });
  });

  it("lists each week's game, stat line and fantasy points", async () => {
    stubSleeper(routes());
    open();
    const table = await screen.findByRole("table", { name: /by week/ });
    const rows = within(table).getAllByRole("row").slice(1);
    // Week 5 has no points anywhere in the league yet, so it waits.
    expect(rows).toHaveLength(4);
    expect(within(rows[0]).getByText("vs ARI")).toBeTruthy();
    expect(within(rows[0]).getByText(/^6\/9 rec, 88 yds, 1 TD/)).toBeTruthy();
    expect(within(rows[1]).getByText("@ LV")).toBeTruthy();
    expect(within(rows[3]).getByText(/^No touches/)).toBeTruthy();
    const week1 = fantasyWeek(fixture.matchups["1"], ID)!;
    expect(within(rows[0]).getByText(week1.points.toFixed(2))).toBeTruthy();
    expect(within(rows[0]).getByText(new RegExp(`^Started vs Team ${week1.opponent}$`))).toBeTruthy();
  });

  it("keeps the CLT points when Sleeper's stats fail", async () => {
    stubSleeper(routes({ [statsUrl]: () => new Response("{}", { status: 500 }) }));
    open();
    expect(await screen.findByText(/NFL stats didn.t load/)).toBeTruthy();
    const table = screen.getByRole("table", { name: /by week/ });
    expect(within(table).getAllByRole("row")).toHaveLength(5);
  });

  it("says so when Sleeper has no such player", async () => {
    stubSleeper(routes({ [`${SLEEPER_WEB}/players/nfl/1`]: null }));
    open("1");
    expect((await screen.findByRole("alert")).textContent).toBe("Sleeper has no player 1.");
  });

  it("reads its link and titles itself once the player loads", async () => {
    expect(parseOpen("?open=player:4984,player:LAC,player:x;y")).toEqual([
      { kind: "player", params: { playerId: "4984" } },
      { kind: "player", params: { playerId: "LAC" } },
    ]);
    stubSleeper(routes());
    open();
    await screen.findByRole("heading", { name: /Test Starter/ });
    expect(windowTitle({ kind: "player", params: { playerId: ID } })).toBe("Test Starter");
  });
});

describe("Player window ranks", () => {
  const RANKED = "position[]=QB&position[]=RB&position[]=WR&position[]=TE&position[]=K";
  const wr = (player_id: string, stats: Record<string, number>) => ({ player_id, stats, player: { position: "WR" } });

  it("shows his season rank and week's projected rank in CLT scoring, and his dynasty rank", async () => {
    stubSleeper(
      routes({
        [`${SLEEPER_WEB}/stats/nfl/2026?season_type=regular&${RANKED}`]: [wr("other", { rec: 30, rec_yd: 400 }), wr(ID, { rec: 17, rec_yd: 239, rec_td: 1 })],
        [`${SLEEPER_WEB}/projections/nfl/2026/4?season_type=regular&${RANKED}`]: [wr(ID, { rec: 6, rec_yd: 70 }), wr("other", { rec: 5, rec_yd: 50 })],
        "https://api.fantasycalc.com/values/current?isDynasty=true&numQbs=2&numTeams=12&ppr=1": [
          { player: { sleeperId: "qb", position: "QB" }, value: 9000 },
          { player: { sleeperId: ID, position: "WR" }, value: 6000 },
        ],
      }),
    );
    render(
      <MemberProvider>
        <PlayerWindow params={{ playerId: ID }} />
      </MemberProvider>,
    );
    expect(await screen.findByText("Season WR2, 46.9 pts")).toBeTruthy();
    expect(await screen.findByText("Week 4 proj WR1, 13.0 pts")).toBeTruthy();
    expect(await screen.findByText("Dynasty WR1, #2 overall")).toBeTruthy();
  });
});
