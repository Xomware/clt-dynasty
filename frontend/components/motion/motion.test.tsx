import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CountUp } from "./CountUp";

afterEach(() => {
  vi.useRealTimers();
  delete document.documentElement.dataset.theme;
});

describe("CountUp", () => {
  it("shows the real number straight away outside Uptown", () => {
    render(<CountUp value={123.456} decimals={2} />);
    expect(screen.getByText("123.46")).toBeTruthy();
  });

  it("shows the empty text for a value at zero", () => {
    document.documentElement.dataset.theme = "buzz";
    render(<CountUp value={0} decimals={2} empty="-" />);
    expect(screen.getByText("-")).toBeTruthy();
  });

  it("rolls up from zero under Uptown, then follows a live change to its new value", () => {
    vi.useFakeTimers({ toFake: ["requestAnimationFrame", "cancelAnimationFrame", "performance"] });
    document.documentElement.dataset.theme = "buzz";
    const { container, rerender } = render(<CountUp value={100} />);
    const span = container.querySelector("span")!;
    expect(span.textContent).toBe("0");
    act(() => vi.advanceTimersByTime(300));
    expect(Number(span.textContent)).toBeGreaterThan(0);
    expect(Number(span.textContent)).toBeLessThan(100);
    act(() => vi.advanceTimersByTime(1000));
    expect(span.textContent).toBe("100");

    rerender(<CountUp value={140} />);
    act(() => vi.advanceTimersByTime(1000));
    expect(span.textContent).toBe("140");
    // Still React's own text node, so later renders keep landing.
    rerender(<CountUp value={7} />);
    act(() => vi.advanceTimersByTime(1000));
    expect(span.textContent).toBe("7");
  });
});
