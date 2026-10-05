import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { stubSleeper } from "@/lib/test/league-mock";
import { MatchupHistoryWindow } from "./MatchupHistoryWindow";

beforeEach(() => {
  stubSleeper();
});
afterEach(() => {
  vi.restoreAllMocks();
});

const weeks = () => screen.getAllByText(/^Week \d+/, { selector: "summary" }).map((s) => s.textContent);

describe("Matchup History", () => {
  it("lists this season's finished weeks, newest first and open", async () => {
    render(<MatchupHistoryWindow />);
    await screen.findByText("Week 3", { exact: false, selector: "summary" });
    expect(weeks()).toEqual(["Week 3 6 games", "Week 2 6 games", "Week 1 6 games"]);
    expect(await screen.findAllByRole("region", { name: /^Matchup / })).toHaveLength(6);
  });

  it("tags a past season's playoff and consolation games", async () => {
    render(<MatchupHistoryWindow />);
    fireEvent.change(await screen.findByLabelText("Season"), { target: { value: "1181789700187090944" } });
    expect(weeks()[0]).toBe("Week 17 (playoffs) 4 games");

    const games = await screen.findAllByRole("region", { name: /^Matchup / });
    const tags = games.map((g) => within(g).queryByText(/^(Playoffs|Consolation)$/)?.textContent);
    expect(tags.filter((t) => t === "Playoffs")).toHaveLength(1);
    expect(tags.filter((t) => t === "Consolation")).toHaveLength(3);
    const final = games[tags.indexOf("Playoffs")];
    expect(within(final).getByRole("button").textContent).toMatch(/124\.38.*117\.12|117\.12.*124\.38/);
  });

  it("opens an older week on demand", async () => {
    render(<MatchupHistoryWindow />);
    const week1 = await screen.findByText("Week 1", { exact: false, selector: "summary" });
    const details = week1.closest("details")!;
    details.open = true;
    fireEvent(details, new Event("toggle"));
    expect(await within(details).findAllByRole("region", { name: /^Matchup / })).toHaveLength(6);
  });

  it("says when Sleeper is down", async () => {
    vi.mocked(fetch).mockImplementation(async () => new Response("down", { status: 503 }));
    render(<MatchupHistoryWindow />);
    expect((await screen.findByRole("alert")).textContent).toMatch(/503/);
  });
});
