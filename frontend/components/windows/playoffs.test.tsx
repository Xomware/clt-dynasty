import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { fixture, pastFixture, stubSleeper } from "@/lib/test/league-mock";
import { PlayoffsWindow } from "./PlayoffsWindow";

const league = `/league/${fixture.league.league_id}`;
const [season2025, season2024] = Object.values(pastFixture);
const names = (el: HTMLElement) => [...el.querySelectorAll(".xp-team-name")].map((n) => n.textContent);
const round = (name: RegExp) => screen.findByRole("region", { name });
const slotOf = (el: HTMLElement, team: string) =>
  [...el.querySelectorAll<HTMLElement>(".pb-slot")].find((s) => s.textContent?.includes(team));

async function openSeason(season: string) {
  const picker = await screen.findByLabelText("Season");
  fireEvent.change(picker, { target: { value: Object.values(pastFixture).find((s) => s.league.season === season)!.league.league_id } });
}

// jsdom has no layout, so no scrollIntoView.
Element.prototype.scrollIntoView = () => {};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Playoffs", () => {
  it("projects the bracket from today's standings, byes beside the games they meet", async () => {
    stubSleeper();
    render(<PlayoffsWindow />);

    const wildCard = await round(/^Wild Card/);
    expect(screen.getByText("Projected")).toBeTruthy();
    expect(screen.getByText(/If the season ended today, after week 3/)).toBeTruthy();
    expect(names(wildCard)).toEqual(["Team 2", "Team 12", "Team 7", "Team 4", "Team 11", "Team 5"]);
    expect(within(wildCard).getByRole("group", { name: "Bye: seed 1" }).textContent).toContain("Team 2");
    expect(slotOf(wildCard, "Team 12")?.textContent).toContain("2-1");

    const semis = await round(/^Semifinals/);
    expect(within(semis).getByText("Winner of 4 v 5")).toBeTruthy();
    expect(within(await round(/^Championship/)).getByText("Crowned week 17")).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Final standings" })).toBeNull();
    expect(document.querySelector(".pb-line[data-on]")).toBeNull();
  });

  it("shows a past season's results: winners advance, losers drop out, the champion is crowned", async () => {
    stubSleeper();
    render(<PlayoffsWindow />);
    await openSeason("2025");

    const final = await round(/^Championship/);
    expect(within(final).getByText("2025 Champion").parentElement?.textContent).toContain("Team 10");
    expect(slotOf(final, "Team 10")?.dataset.result).toBe("won");
    expect(slotOf(final, "Team 4")?.dataset.result).toBe("lost");
    expect(names(await round(/^Semifinals/))).toEqual(["Team 10", "Team 11", "Team 4", "Team 3"]);
    expect(names(screen.getByRole("region", { name: "Final standings" }))).toEqual([
      "Team 10",
      "Team 4",
      "Team 3",
      "Team 11",
      "Team 5",
      "Team 7",
    ]);
    expect(screen.queryByText("Projected")).toBeNull();
  });

  it.each([season2024, season2025])("crowns the champion Sleeper recorded in $league.season", async (s) => {
    stubSleeper();
    render(<PlayoffsWindow />);
    await openSeason(s.league.season);

    const final = await round(/^Championship/);
    const champion = within(final).getByText(`${s.league.season} Champion`).parentElement!;
    expect(names(champion)).toEqual([`Team ${s.league.metadata?.latest_league_winner_roster_id}`]);
  });

  it("opens a game's lineups from its score", async () => {
    stubSleeper();
    render(<PlayoffsWindow />);
    await openSeason("2025");

    const final = await round(/^Championship/);
    const score = within(slotOf(final, "Team 10")!).getByRole("button", { name: /points, show the Championship lineups/ });
    fireEvent.click(score);
    const lineups = screen.getByRole("region", { name: /Championship lineups/ });
    expect(names(lineups).sort()).toEqual(["Team 10", "Team 4"]);
    expect(document.activeElement).toBe(lineups);

    fireEvent.click(within(lineups).getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("region", { name: /Championship lineups/ })).toBeNull();
    expect(document.activeElement).toBe(score);
  });

  it("says when Sleeper hasn't drawn a bracket the playoffs need", async () => {
    stubSleeper({
      "/state/nfl": { ...fixture.state, week: 16, leg: 16 },
      [`${league}/winners_bracket`]: [],
      [`${league}/matchups/15`]: [],
      [`${league}/matchups/16`]: [],
    });
    render(<PlayoffsWindow />);
    expect(await screen.findByText(/hasn.t drawn the 2026 bracket yet/)).toBeTruthy();
  });

  it("waits for week 1 before projecting", async () => {
    stubSleeper({ "/state/nfl": { ...fixture.state, week: 1, leg: 1 } });
    render(<PlayoffsWindow />);
    expect(await screen.findByText("The 2026 projection starts once week 1 is final.")).toBeTruthy();
  });

  it("says when Sleeper is down", async () => {
    stubSleeper({ [`${league}/rosters`]: () => new Response("down", { status: 502 }) });
    render(<PlayoffsWindow />);
    expect((await screen.findByRole("alert")).textContent).toMatch(/502/);
  });
});
