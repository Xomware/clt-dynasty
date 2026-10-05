import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { calls, stubSleeper } from "@/lib/test/league-mock";
import { useLeague } from "./use-league";

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "Date"] });
  stubSleeper();
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("useLeague", () => {
  it("polls the live week and refetches it on refresh()", async () => {
    const { result } = renderHook(() => useLeague(4));
    await vi.waitFor(() => expect(result.current.matchups).toHaveLength(12));
    expect(calls("/matchups/4")).toBe(1);

    act(() => vi.advanceTimersByTime(60_000));
    await vi.waitFor(() => expect(calls("/matchups/4")).toBe(2));

    act(() => result.current.refresh());
    await vi.waitFor(() => expect(calls("/matchups/4")).toBe(3));
  });

  it("fetches a finished week once, without polling", async () => {
    const { result } = renderHook(() => useLeague(3));
    await vi.waitFor(() => expect(result.current.matchups).toHaveLength(12));

    act(() => vi.advanceTimersByTime(5 * 60_000));
    const second = renderHook(() => useLeague(3));
    await vi.waitFor(() => expect(second.result.current.matchups).toHaveLength(12));
    expect(calls("/matchups/3")).toBe(1);
    expect(calls("/users")).toBe(1);
  });

  it("names a team from its owner, falling back to the roster id", async () => {
    const { result } = renderHook(() => useLeague());
    await vi.waitFor(() => expect(result.current.data).not.toBeNull());
    expect(result.current.teamFor(7)).toEqual({ name: "Team 7", avatarUrl: null });
    expect(result.current.teamFor(99).name).toBe("Team 99");
    // No member signed in outside the provider, so no team is theirs.
    expect(result.current.myRosterId).toBeNull();
  });

  it("reports a Sleeper failure", async () => {
    vi.mocked(fetch).mockImplementation(async () => new Response("down", { status: 503 }));
    const { result } = renderHook(() => useLeague());
    await vi.waitFor(() => expect(result.current.error).toMatch(/503/));
  });
});
