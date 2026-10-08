import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TIMING } from "@/components/theme/ThemeTransition";
import { stubSleeper } from "@/lib/test/league-mock";
import { THEME_KEY } from "@/lib/theme/script";
import { ThemeProvider } from "@/lib/theme/theme";
import { Landing } from "@/components/landing/Landing";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});

const renderLanding = (onSignIn?: () => void) =>
  render(
    <ThemeProvider>
      <Landing onSignIn={onSignIn} />
    </ThemeProvider>,
  );

describe("Buzz City landing", () => {
  it("shows the stored Buzz City theme with the same live data and two sign-in buttons", async () => {
    stubSleeper();
    localStorage.setItem(THEME_KEY, "buzz");
    const onSignIn = vi.fn();
    renderLanding(onSignIn);

    expect(screen.getByRole("heading", { level: 1, name: "CLT Dynasty Fantasy Football" })).toBeTruthy();
    const status = screen.getByRole("region", { name: "Tonight in the league" });
    expect(await within(status).findByText("Week 4 of 14")).toBeTruthy();
    expect(screen.getByRole("table", { name: "Playoff seeds as of today" })).toBeTruthy();
    expect(screen.getByRole("list", { name: "Champions by season" })).toBeTruthy();

    expect(screen.queryByRole("region", { name: "About Charlotte" })).toBeNull();
    const buttons = screen.getAllByRole("button", { name: "Sign in with Google" });
    expect(buttons).toHaveLength(2);
    buttons.forEach((b) => fireEvent.click(b));
    expect(onSignIn).toHaveBeenCalledTimes(2);
  });

  it("keeps the page and offers a retry in each live card when Sleeper is down", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async () => new Response("{}", { status: 503 }));
    localStorage.setItem(THEME_KEY, "buzz");
    renderLanding();
    expect((await screen.findAllByRole("button", { name: /try again/i })).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "What’s inside" })).toBeTruthy();
  });

  it("switches between the two landings from either one's toggle", () => {
    stubSleeper();
    localStorage.setItem(THEME_KEY, "xp");
    renderLanding();
    expect(screen.getByText("To begin, sign in")).toBeTruthy();

    vi.useFakeTimers();
    fireEvent.click(screen.getByRole("button", { name: "Buzz City" }));
    act(() => vi.advanceTimersByTime(TIMING.buzz.total));
    expect(screen.getByRole("region", { name: "Tonight in the league" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Classic XP" }));
    act(() => vi.advanceTimersByTime(TIMING.xp.total));
    expect(screen.getByText("To begin, sign in")).toBeTruthy();
  });
});
