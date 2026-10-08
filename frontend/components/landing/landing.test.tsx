import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { draftNote, phaseOf } from "@/lib/landing/overview";
import type { SleeperDraft, SleeperLeague, SleeperNflState } from "@/lib/sleeper/types";
import { fixture, stubSleeper } from "@/lib/test/league-mock";
import { Landing } from "./Landing";

afterEach(() => {
  vi.restoreAllMocks();
});

const down = () => new Response("{}", { status: 503 });

describe("Landing", () => {
  it("pops a tour balloon from the tray a moment in, which fades out on its X", () => {
    vi.useFakeTimers();
    stubSleeper();
    render(<Landing onSignIn={() => {}} />);
    expect(screen.queryByText("Take a tour of CLT Dynasty")).toBeNull();
    act(() => vi.advanceTimersByTime(2500));
    expect(screen.getByText("Take a tour of CLT Dynasty")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Close notification" }));
    expect(document.querySelector(".landing-balloon[data-leaving]")).not.toBeNull();
    act(() => vi.advanceTimersByTime(200));
    expect(screen.queryByText("Take a tour of CLT Dynasty")).toBeNull();
    vi.useRealTimers();
  });

  it("calls onSignIn from both sign-in tiles, and disables them without a handler", () => {
    stubSleeper();
    const onSignIn = vi.fn();
    const { unmount } = render(<Landing onSignIn={onSignIn} />);
    const tiles = screen.getAllByRole("button", { name: "Sign in with Google" });
    expect(tiles).toHaveLength(2);
    tiles.forEach((t) => fireEvent.click(t));
    expect(onSignIn).toHaveBeenCalledTimes(2);
    unmount();

    render(<Landing />);
    for (const t of screen.getAllByRole("button", { name: "Sign in with Google" })) expect((t as HTMLButtonElement).disabled).toBe(true);
  });

  it("shows the live week, the playoff seeds and every past champion from Sleeper", async () => {
    stubSleeper();
    render(<Landing onSignIn={() => {}} />);

    const status = screen.getByRole("region", { name: "League Status" });
    expect(within(status).getByRole("status", { name: "Loading league status" })).toBeTruthy();
    expect(await within(status).findByText("Week 4 of 14")).toBeTruthy();
    expect(status.textContent).toMatch(/Reigning champTeam 10 \(2025\)/);
    expect(status.textContent).toMatch(/Last draftJul 6, 2026, 5 rounds/);

    const champions = screen.getByRole("list", { name: "Champions by season" });
    const [latest, first] = within(champions).getAllByRole("listitem");
    expect(latest.querySelector(".xp-team-name")?.textContent).toBe("Team 10");
    expect(latest.textContent).toMatch(/^2025.*Beat Team 4 in the final$/);
    expect(first.querySelector(".xp-team-name")?.textContent).toBe("Team 2");
    expect(first.textContent).toMatch(/^2024.*Beat Team 11 in the final$/);

    const rows = within(screen.getByRole("table", { name: "Playoff seeds as of today" })).getAllByRole("row").slice(1);
    expect(rows).toHaveLength(6);
    const divisions = rows.slice(0, 3).map((r) => r.querySelectorAll("td")[2].textContent);
    expect(new Set(divisions)).toEqual(new Set(["BIG10", "SEC", "ACC"]));
  });

  it("keeps the static landing and offers a retry when Sleeper is down", async () => {
    const fetch = stubSleeper({ "/state/nfl": down });
    render(<Landing onSignIn={() => {}} />);

    expect((await screen.findByRole("alert")).textContent).toMatch(/Couldn’t load the league from Sleeper: Sleeper \/state\/nfl: 503/);
    expect(screen.getByRole("heading", { level: 1, name: "CLT Dynasty" })).toBeTruthy();
    expect(screen.getByText("Taxi Squads")).toBeTruthy();
    expect(screen.getByText("Full PPR, 1.5 per TE catch")).toBeTruthy();

    fetch.mockRestore();
    stubSleeper();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Week 4 of 14")).toBeTruthy();
  });
});

const league = (status: string, settings: Partial<SleeperLeague["settings"]> = {}) =>
  ({ ...fixture.league, status, settings: { ...fixture.league.settings, ...settings } }) as SleeperLeague;
const nfl = (week: number, season_type = "regular"): SleeperNflState => ({ ...fixture.state, week, season_type });

describe("phaseOf", () => {
  it("names the offseason, the draft, the regular season, the playoffs and the end", () => {
    expect(phaseOf(league("pre_draft"), nfl(1, "off"))).toEqual({ phase: "Offseason: the 2026 draft is next", live: false });
    expect(phaseOf(league("drafting"), nfl(1, "off")).phase).toBe("The 2026 draft is on");
    expect(phaseOf(league("in_season"), nfl(1, "pre"))).toEqual({ phase: "2026 preseason", live: false });
    expect(phaseOf(league("in_season"), nfl(14))).toEqual({ phase: "Week 14 of 14", live: true });
    expect(phaseOf(league("in_season"), nfl(16)).phase).toBe("Playoffs, round 2");
    expect(phaseOf(league("complete"), nfl(18)).phase).toBe("The 2026 season is complete");
  });
});

describe("draftNote", () => {
  const draft = (status: SleeperDraft["status"], start_time: number | null) =>
    ({ draft_id: status, season: "2027", status, start_time, settings: { rounds: 5, teams: 12 } }) as SleeperDraft;

  it("prefers a scheduled draft, then one under way, then the last one held", () => {
    expect(draftNote([draft("complete", 1783377060846), draft("pre_draft", Date.UTC(2027, 6, 10, 23))])).toEqual({
      label: "Next draft",
      detail: "Jul 10, 2027",
    });
    expect(draftNote([draft("pre_draft", null)])?.detail).toBe("Date not set yet");
    expect(draftNote([draft("drafting", 1)])).toEqual({ label: "Draft", detail: "On the clock now" });
    expect(draftNote([draft("complete", 1783377060846)])?.label).toBe("Last draft");
    expect(draftNote([])).toBeNull();
  });
});
