import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { HEAD_SCRIPT, SEEN_KEY } from "@/lib/intro/seen";
import { play } from "@/lib/sound/sound";
import { stubSleeper } from "@/lib/test/league-mock";
import { Intro } from "./Intro";

vi.mock("@/lib/sound/sound", () => ({ play: vi.fn() }));

beforeEach(() => {
  HTMLImageElement.prototype.decode ??= () => Promise.resolve();
  stubSleeper();
});

afterEach(() => {
  vi.useRealTimers();
  vi.mocked(play).mockClear();
  sessionStorage.clear();
  localStorage.clear();
  delete document.documentElement.dataset.intro;
  delete document.documentElement.dataset.booted;
});

const overlay = (c: HTMLElement) => c.querySelector(".intro");

// jsdom has no AnimationEvent, so React listens for the webkit-prefixed names there.
function animation(el: Element, type: "Start" | "End", animationName: string) {
  const e = Object.assign(new Event(`webkitAnimation${type}`, { bubbles: true }), { animationName });
  act(() => void el.dispatchEvent(e));
}

describe("Intro", () => {
  it("checks the league on the POST screen once Sleeper answers", async () => {
    const { container } = render(<Intro />);
    expect(container.querySelector(".xpi-post")?.textContent).toContain("Detecting teams");

    await waitFor(() => expect(container.querySelector(".xpi-post")?.textContent).toContain("BIG10, SEC, ACC"));
    expect(container.querySelector(".xpi-post")?.textContent).toContain("Loading Week 4 matchups");
  });

  it("signs in the league's teams on the Welcome screen, lighting yours", async () => {
    localStorage.setItem("clt.intro.me", "u7");
    const { container } = render(<Intro />);

    await waitFor(() => expect(container.querySelectorAll(".xpi-tiles li")).toHaveLength(12));
    expect(container.querySelector("[data-me] .xpi-tile-name")?.textContent).toBe("Team 7");
    expect(container.querySelector(".xpi-welcome-mine")?.textContent).toBe("Team 7");
  });

  it("lights no tile for a visitor it doesn't know", async () => {
    const { container } = render(<Intro />);
    await waitFor(() => expect(container.querySelectorAll(".xpi-tiles li")).toHaveLength(12));
    expect(container.querySelector("[data-me]")).toBeNull();
  });

  it("chimes as the Welcome screen comes up, not before", () => {
    const { container } = render(<Intro />);
    animation(container.querySelector(".xpi-boot")!, "Start", "xpi-boot");
    expect(play).not.toHaveBeenCalled();

    animation(container.querySelector(".xpi-welcome")!, "Start", "xpi-welcome");
    expect(play).toHaveBeenCalledWith("startup");
  });

  it("starts the page under it, desktop icons included, as it begins to fade", () => {
    const { container } = render(<Intro />);
    animation(overlay(container)!, "Start", "xpi-exit");
    expect(overlay(container)?.getAttribute("data-phase")).toBe("leave");
    expect(document.documentElement.dataset.booted).toBe("");
  });

  it("fades out on Skip with the chime, then unmounts and remembers it was seen", () => {
    vi.useFakeTimers();
    const { container } = render(<Intro />);
    fireEvent.click(screen.getByRole("button", { name: "Skip intro" }));

    expect(overlay(container)?.getAttribute("data-phase")).toBe("skip");
    expect(play).toHaveBeenCalledWith("startup");
    act(() => vi.advanceTimersByTime(250));
    expect(overlay(container)).toBeNull();
    expect(sessionStorage.getItem(SEEN_KEY)).toBe("1");
  });

  it("skips on a click anywhere and on Escape", () => {
    const { container, unmount } = render(<Intro />);
    fireEvent.click(overlay(container)!);
    expect(overlay(container)?.getAttribute("data-phase")).toBe("skip");
    unmount();

    const second = render(<Intro />);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(overlay(second.container)?.getAttribute("data-phase")).toBe("skip");
  });

  it("ends when the stage's own exit animation does, not a child's", () => {
    const { container } = render(<Intro />);
    animation(container.querySelector(".xpi-welcome")!, "End", "xpi-exit");
    animation(overlay(container)!, "End", "xpi-welcome");
    expect(overlay(container)).not.toBeNull();

    animation(overlay(container)!, "End", "xpi-exit");
    expect(overlay(container)).toBeNull();
    expect(sessionStorage.getItem(SEEN_KEY)).toBe("1");
  });

  it("uncovers the page even if no animation event ever comes", () => {
    vi.useFakeTimers();
    const { container } = render(<Intro />);
    act(() => vi.advanceTimersByTime(6000));
    expect(overlay(container)).toBeNull();
  });

  it("renders nothing and asks Sleeper nothing once the head script has marked it skipped", () => {
    document.documentElement.dataset.intro = "skip";
    vi.mocked(fetch).mockClear();
    const { container } = render(<Intro />);
    expect(overlay(container)).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("HEAD_SCRIPT", () => {
  const run = () => new Function(HEAD_SCRIPT)();

  it("lets a first visit play", () => {
    run();
    expect(document.documentElement.dataset.intro).toBeUndefined();
  });

  it("skips once seen this session, and on the sign-in callback", () => {
    sessionStorage.setItem(SEEN_KEY, "1");
    run();
    expect(document.documentElement.dataset.intro).toBe("skip");

    sessionStorage.clear();
    delete document.documentElement.dataset.intro;
    window.history.replaceState(null, "", "/auth/callback/");
    run();
    expect(document.documentElement.dataset.intro).toBe("skip");
    window.history.replaceState(null, "", "/");
  });

  it("plays when storage throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    expect(run).not.toThrow();
    expect(document.documentElement.dataset.intro).toBeUndefined();
    vi.restoreAllMocks();
  });
});
