import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SEEN_KEY } from "@/lib/intro/seen";
import { THEME_KEY } from "@/lib/theme/script";
import { BuzzIntro } from "./BuzzIntro";
import { Intro } from "./Intro";

// Node's own localStorage stub shadows jsdom's; the theme store reads the global.
beforeEach(() => {
  vi.stubGlobal("localStorage", (globalThis as unknown as { jsdom: { window: Window } }).jsdom.window.localStorage);
});

afterEach(() => {
  vi.useRealTimers();
  localStorage.clear();
  vi.unstubAllGlobals();
  sessionStorage.clear();
  delete document.documentElement.dataset.intro;
});

function animationEnd(el: Element, animationName: string) {
  const e = Object.assign(new Event("webkitAnimationEnd", { bubbles: true }), { animationName });
  act(() => void el.dispatchEvent(e));
}

const both = () =>
  render(
    <>
      <Intro />
      <BuzzIntro />
    </>,
  );

describe("first-load intro by theme", () => {
  it("plays the Buzz City intro, not the skyline, for a Buzz City visitor", () => {
    localStorage.setItem(THEME_KEY, "buzz");
    const { container } = both();
    expect(container.querySelector(".bzi")).not.toBeNull();
    expect(container.querySelector(".intro")).toBeNull();
    expect(screen.getAllByRole("button", { name: "Skip intro" })).toHaveLength(1);
  });

  it("plays the skyline for everyone else", () => {
    const { container } = both();
    expect(container.querySelector(".intro")).not.toBeNull();
    expect(container.querySelector(".bzi")).toBeNull();
  });

  it("plays neither once seen this session", () => {
    localStorage.setItem(THEME_KEY, "buzz");
    document.documentElement.dataset.intro = "skip";
    const { container } = both();
    expect(container.querySelector(".bzi, .intro")).toBeNull();
  });
});

describe("BuzzIntro", () => {
  beforeEach(() => localStorage.setItem(THEME_KEY, "buzz"));

  it("ends on its own exit animation, not a child's, and remembers it was seen", () => {
    const { container } = render(<BuzzIntro />);
    const stage = container.querySelector(".bzi")!;
    animationEnd(container.querySelector(".bzi-lockup")!, "bzi-exit");
    animationEnd(stage, "bzi-ink");
    expect(container.querySelector(".bzi")).not.toBeNull();

    animationEnd(stage, "bzi-exit");
    expect(container.querySelector(".bzi")).toBeNull();
    expect(sessionStorage.getItem(SEEN_KEY)).toBe("1");
  });

  it("fades out on Skip, a tap anywhere or Escape", () => {
    vi.useFakeTimers();
    const { container, unmount } = render(<BuzzIntro />);
    fireEvent.click(screen.getByRole("button", { name: "Skip intro" }));
    expect(container.querySelector(".bzi")?.getAttribute("data-phase")).toBe("skip");
    act(() => vi.advanceTimersByTime(250));
    expect(container.querySelector(".bzi")).toBeNull();
    unmount();

    const tap = render(<BuzzIntro />);
    fireEvent.click(tap.container.querySelector(".bzi")!);
    expect(tap.container.querySelector(".bzi")?.getAttribute("data-phase")).toBe("skip");
    tap.unmount();

    const key = render(<BuzzIntro />);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(key.container.querySelector(".bzi")?.getAttribute("data-phase")).toBe("skip");
  });

  it("uncovers the page even if no animation event ever comes", () => {
    vi.useFakeTimers();
    const { container } = render(<BuzzIntro />);
    act(() => vi.advanceTimersByTime(6000));
    expect(container.querySelector(".bzi")).toBeNull();
  });
});
