import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { TIMING } from "@/components/theme/ThemeTransition";
import { THEME_KEY, THEME_SCRIPT } from "./script";
import { ThemeProvider, useTheme } from "./theme";

const html = document.documentElement;
const themeColor = () => document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.content;
const overlay = () => document.querySelector(".theme-transition");

function Current() {
  return <p data-testid="theme">{useTheme().theme}</p>;
}

function renderToggle() {
  return render(
    <ThemeProvider>
      <Current />
      <ThemeToggle />
    </ThemeProvider>,
  );
}

const pressed = (name: string) => screen.getByRole("button", { name }).getAttribute("aria-pressed");

beforeEach(() => {
  vi.useFakeTimers();
  motion(false);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  localStorage.clear();
  delete html.dataset.theme;
  html.removeAttribute("style");
  document.querySelector('meta[name="theme-color"]')?.remove();
  vi.unstubAllGlobals();
});

// The setup's matchMedia stub is dropped by unstubAllGlobals, so each test sets its own.
function motion(reduced: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: reduced && query.includes("reduce"),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
  vi.stubGlobal("localStorage", (globalThis as unknown as { jsdom: { window: Window } }).jsdom.window.localStorage);
}

describe("ThemeProvider", () => {
  it("starts in XP and leaves <html> as XP always had it", () => {
    renderToggle();
    expect(screen.getByTestId("theme").textContent).toBe("xp");
    expect(pressed("Classic XP")).toBe("true");
    expect(html.dataset.theme).toBeUndefined();
    expect(themeColor()).toBeUndefined();
  });

  it("covers the screen, swaps under the cover, then uncovers", () => {
    renderToggle();
    fireEvent.click(screen.getByRole("button", { name: "Uptown" }));

    expect(overlay()?.getAttribute("data-to")).toBe("uptown");
    expect(screen.getByRole<HTMLButtonElement>("button", { name: "Uptown" }).disabled).toBe(true);
    act(() => vi.advanceTimersByTime(TIMING.uptown.covered - 1));
    expect(screen.getByTestId("theme").textContent).toBe("xp");

    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByTestId("theme").textContent).toBe("uptown");
    expect(html.dataset.theme).toBe("uptown");
    expect(themeColor()).toBe("#0a1838");
    expect(localStorage.getItem(THEME_KEY)).toBe("uptown");
    expect(overlay()).not.toBeNull();
    expect(screen.getByRole("status").textContent).toBe("Uptown theme on");

    act(() => vi.advanceTimersByTime(TIMING.uptown.total - TIMING.uptown.covered));
    expect(overlay()).toBeNull();
    expect(pressed("Uptown")).toBe("true");
    expect(screen.getByRole<HTMLButtonElement>("button", { name: "Classic XP" }).disabled).toBe(false);
  });

  it("ignores a second switch while one plays", () => {
    function Both() {
      const { setTheme } = useTheme();
      return (
        <button type="button" onClick={() => (setTheme("uptown"), setTheme("xp"))}>
          both
        </button>
      );
    }
    render(
      <ThemeProvider>
        <Current />
        <Both />
      </ThemeProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "both" }));
    act(() => vi.advanceTimersByTime(TIMING.uptown.total));
    expect(screen.getByTestId("theme").textContent).toBe("uptown");
    expect(overlay()).toBeNull();
  });

  it("switches back to XP and clears what Uptown put on <html>", () => {
    localStorage.setItem(THEME_KEY, "uptown");
    renderToggle();
    expect(html.dataset.theme).toBe("uptown");

    fireEvent.click(screen.getByRole("button", { name: "Classic XP" }));
    expect(overlay()?.getAttribute("data-to")).toBe("xp");
    act(() => vi.advanceTimersByTime(TIMING.xp.total));
    expect(html.dataset.theme).toBeUndefined();
    expect(html.style.backgroundColor).toBe("");
    expect(themeColor()).toBeUndefined();
    expect(localStorage.getItem(THEME_KEY)).toBe("xp");
  });

  it("swaps at once with no overlay under reduced motion", () => {
    motion(true);
    renderToggle();
    fireEvent.click(screen.getByRole("button", { name: "Uptown" }));
    expect(overlay()).toBeNull();
    expect(screen.getByTestId("theme").textContent).toBe("uptown");
  });

  it("holds the choice for the visit when storage refuses it", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("quota", "QuotaExceededError");
    });
    renderToggle();
    fireEvent.click(screen.getByRole("button", { name: "Uptown" }));
    act(() => vi.advanceTimersByTime(TIMING.uptown.total));
    expect(screen.getByTestId("theme").textContent).toBe("uptown");

    // A later save that works hands the choice back to storage.
    vi.mocked(Storage.prototype.setItem).mockRestore();
    fireEvent.click(screen.getByRole("button", { name: "Classic XP" }));
    act(() => vi.advanceTimersByTime(TIMING.xp.total));
    expect(localStorage.getItem(THEME_KEY)).toBe("xp");
  });
});

describe("THEME_SCRIPT", () => {
  const run = () => new Function(THEME_SCRIPT)();

  it("paints Uptown before hydration when it is stored", () => {
    localStorage.setItem(THEME_KEY, "uptown");
    run();
    expect(html.dataset.theme).toBe("uptown");
    expect(themeColor()).toBe("#0a1838");
  });

  it("leaves XP and unknown values alone", () => {
    localStorage.setItem(THEME_KEY, "glacier");
    run();
    expect(html.dataset.theme).toBeUndefined();
    expect(themeColor()).toBeUndefined();
  });

  it("survives storage that throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("denied", "SecurityError");
    });
    expect(run).not.toThrow();
    expect(html.dataset.theme).toBeUndefined();
  });
});
