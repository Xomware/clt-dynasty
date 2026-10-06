import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { HEAD_SCRIPT, SEEN_KEY } from "@/lib/intro/seen";
import { Intro } from "./Intro";

afterEach(() => {
  vi.useRealTimers();
  sessionStorage.clear();
  delete document.documentElement.dataset.intro;
});

const overlay = (c: HTMLElement) => c.querySelector(".intro");

// jsdom has no AnimationEvent, so React listens for the webkit-prefixed name there.
function animationEnd(el: Element, animationName: string) {
  const e = Object.assign(new Event("webkitAnimationEnd", { bubbles: true }), { animationName });
  act(() => void el.dispatchEvent(e));
}

describe("Intro", () => {
  it("fades out on Skip, then unmounts and remembers it was seen", () => {
    vi.useFakeTimers();
    const { container } = render(<Intro />);
    fireEvent.click(screen.getByRole("button", { name: "Skip intro" }));

    expect(overlay(container)?.getAttribute("data-phase")).toBe("skip");
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
    animationEnd(container.querySelector(".intro-crown")!, "intro-exit");
    animationEnd(overlay(container)!, "intro-lights");
    expect(overlay(container)).not.toBeNull();

    animationEnd(overlay(container)!, "intro-exit");
    expect(overlay(container)).toBeNull();
    expect(sessionStorage.getItem(SEEN_KEY)).toBe("1");
  });

  it("uncovers the page even if no animation event ever comes", () => {
    vi.useFakeTimers();
    const { container } = render(<Intro />);
    act(() => vi.advanceTimersByTime(6000));
    expect(overlay(container)).toBeNull();
  });

  it("renders nothing once the head script has marked it skipped", () => {
    document.documentElement.dataset.intro = "skip";
    const { container } = render(<Intro />);
    expect(overlay(container)).toBeNull();
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
