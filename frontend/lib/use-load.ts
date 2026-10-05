"use client";

import { useCallback, useEffect, useState } from "react";

export type Load<T> = { status: "loading" } | { status: "error"; message: string } | { status: "ok"; value: T };

// Runs `load` whenever `key` changes, and again on retry(). A response for an
// earlier key never lands over a later one.
export function useLoad<T>(load: () => Promise<T>, key: string): [Load<T>, () => void] {
  const [state, setState] = useState<{ key: string; attempt: number; load: Load<T> }>({ key, attempt: 0, load: { status: "loading" } });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    load().then(
      (value) => live && setState({ key, attempt, load: { status: "ok", value } }),
      (e: Error) => live && setState({ key, attempt, load: { status: "error", message: e.message } }),
    );
    return () => {
      live = false;
    };
    // `load` is a fresh closure every render; `key` names what it loads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  const current = state.key === key && state.attempt === attempt ? state.load : { status: "loading" as const };
  return [current, retry];
}
