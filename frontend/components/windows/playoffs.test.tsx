import { render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { fixture, stubSleeper } from "@/lib/test/league-mock";
import { PlayoffsWindow } from "./PlayoffsWindow";

const league = `/league/${fixture.league.league_id}`;
const names = (el: HTMLElement) => [...el.querySelectorAll(".xp-team-name")].map((n) => n.textContent);

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Playoffs", () => {
  it("shows Sleeper's projected bracket with the byes, and no placement games", async () => {
    stubSleeper();
    render(<PlayoffsWindow />);

    const round1 = await screen.findByRole("region", { name: "Round 1" });
    expect(screen.getByText("Projected")).toBeTruthy();
    expect(names(within(round1).getAllByRole("listitem")[0])).toEqual(["Team 12", "Team 7"]);
    expect(names(within(round1).getByRole("list", { name: "Round 1 byes" }))).toEqual(["Team 2", "Team 4"]);
    expect(within(screen.getByRole("region", { name: "Final" })).getAllByText(/^Game /).map((g) => g.textContent)).toEqual([
      "Game 6",
    ]);
    expect(screen.queryByRole("heading", { name: "Final standings" })).toBeNull();
  });

  it("ranks a finished bracket and strikes the losers", async () => {
    const results: Record<number, object> = {
      1: { w: 12, l: 7 },
      2: { w: 5, l: 11 },
      3: { t2: 12, w: 2, l: 12 },
      4: { t2: 5, w: 5, l: 4 },
      6: { t1: 2, t2: 5, w: 5, l: 2 },
    };
    const done = fixture.winners_bracket.map((g) => ({ ...g, ...results[g.m] }));
    stubSleeper({
      [league]: { ...fixture.league, status: "complete" },
      [`${league}/winners_bracket`]: done,
      ...Object.fromEntries([15, 16, 17].map((w) => [`${league}/matchups/${w}`, []])),
    });
    render(<PlayoffsWindow />);

    const finish = await screen.findByRole("region", { name: "Final standings" });
    expect(names(finish)).toEqual(["Team 5", "Team 2", "Team 4", "Team 12", "Team 7", "Team 11"]);
    expect(within(screen.getByRole("region", { name: "Final" })).getByText("(out)").closest("li")?.textContent).toContain("Team 2");
    expect(screen.queryByText("Projected")).toBeNull();
  });

  it("says when Sleeper hasn't drawn a bracket", async () => {
    stubSleeper({ [`${league}/winners_bracket`]: [] });
    render(<PlayoffsWindow />);
    expect(await screen.findByText(/hasn.t drawn the 2026 bracket yet/)).toBeTruthy();
  });

  it("says when Sleeper is down", async () => {
    stubSleeper({ [`${league}/winners_bracket`]: () => new Response("down", { status: 502 }) });
    render(<PlayoffsWindow />);
    expect((await screen.findByRole("alert")).textContent).toMatch(/502/);
  });
});
