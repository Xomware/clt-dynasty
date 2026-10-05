import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { sharedResource } from "./shared-resource";

interface Weeks {
  status: "ok";
  week: number;
}

const loaded = (week: number): Weeks => ({ status: "ok", week });
const weekOf = (s: ReturnType<ReturnType<typeof sharedResource<Weeks>>["use"]>) => (s.status === "ok" ? s.week : s.status);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-09-25T22:00:00Z"));
});
afterEach(() => {
  vi.useRealTimers();
});

describe("sharedResource", () => {
  it("serves concurrent callers from one request", async () => {
    const load = vi.fn().mockResolvedValue(loaded(1));
    const weeks = sharedResource<Weeks>(load);
    const { result } = renderHook(() => [weeks.use(), weeks.use()] as const);
    await waitFor(() => expect(result.current.map(weekOf)).toEqual([1, 1]));
    renderHook(() => weeks.use());
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("refetches once on refresh and updates every subscriber", async () => {
    const load = vi.fn().mockResolvedValue(loaded(1));
    const weeks = sharedResource<Weeks>(load);
    const { result } = renderHook(() => [weeks.use(), weeks.use()] as const);
    await waitFor(() => expect(result.current.map(weekOf)).toEqual([1, 1]));

    load.mockResolvedValue(loaded(2));
    act(() => weeks.refresh());
    await waitFor(() => expect(result.current.map(weekOf)).toEqual([2, 2]));
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("drops a failed request so the next caller retries", async () => {
    const load = vi.fn().mockRejectedValueOnce(new Error("boom")).mockResolvedValue(loaded(3));
    const weeks = sharedResource<Weeks>(load);
    const first = renderHook(() => weeks.use());
    await waitFor(() => expect(first.result.current).toEqual({ status: "error", message: "boom" }));
    first.unmount();

    const again = renderHook(() => weeks.use());
    await waitFor(() => expect(weekOf(again.result.current)).toBe(3));
    expect(load).toHaveBeenCalledTimes(2);
  });

  it("ignores a response that a refresh has superseded", async () => {
    let finishOld: (w: Weeks) => void = () => {};
    const load = vi
      .fn()
      .mockReturnValueOnce(new Promise((resolve) => (finishOld = resolve)))
      .mockResolvedValue(loaded(2));
    const weeks = sharedResource<Weeks>(load);
    const { result } = renderHook(() => weeks.use());
    act(() => weeks.refresh());
    await waitFor(() => expect(weekOf(result.current)).toBe(2));
    await act(async () => finishOld(loaded(1)));
    expect(weekOf(result.current)).toBe(2);
  });

  it("refetches for a new subscriber once the data is older than maxAge", async () => {
    const load = vi.fn().mockResolvedValue(loaded(1));
    const weeks = sharedResource<Weeks>(load, 20 * 60_000);
    const first = renderHook(() => weeks.use());
    await waitFor(() => expect(weekOf(first.result.current)).toBe(1));
    first.unmount();

    vi.setSystemTime(new Date("2026-09-25T22:10:00Z"));
    renderHook(() => weeks.use());
    expect(load).toHaveBeenCalledTimes(1);

    load.mockResolvedValue(loaded(2));
    vi.setSystemTime(new Date("2026-09-25T22:21:00Z"));
    const late = renderHook(() => weeks.use());
    await waitFor(() => expect(weekOf(late.result.current)).toBe(2));
    expect(load).toHaveBeenCalledTimes(2);
  });
});
