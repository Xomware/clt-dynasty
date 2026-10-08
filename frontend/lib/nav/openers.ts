"use client";

import { type RefObject, useEffect, useMemo, useRef } from "react";

// Remembers the link or button each page was left from, so Back can hand
// focus to it. Only a click inside `root`, during the navigation it caused,
// counts, so a stale one never steals focus later. Safari never focuses a
// clicked button, so the click target is read rather than document.activeElement.
export function useOpeners(root: RefObject<HTMLElement | null>) {
  const clicked = useRef<Element | null>(null);
  const openers = useRef(new Map<number, Element>());

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = e.target instanceof Element ? e.target.closest("a, button") : null;
      clicked.current = el && root.current?.contains(el) ? el : null;
      // A task, not a microtask: microtasks run between this listener and React's.
      setTimeout(() => {
        clicked.current = null;
      });
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [root]);

  return useMemo(
    () => ({
      leave(depth: number) {
        if (clicked.current) openers.current.set(depth, clicked.current);
        else openers.current.delete(depth);
      },
      // Focus the page's opener if it is still on screen, else `fallback`.
      focus(depth: number, fallback: HTMLElement | null | undefined) {
        const el = openers.current.get(depth);
        (el instanceof HTMLElement && el.isConnected ? el : fallback)?.focus({ preventScroll: true });
      },
    }),
    [],
  );
}
