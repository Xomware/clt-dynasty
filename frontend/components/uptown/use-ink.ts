"use client";

import { useLayoutEffect, useRef } from "react";

// Slides an indicator under a nav's current item: `[aria-current]` inside
// the nav given the returned ref, measured into --ink-x/y/w/h on it. The nav
// must be positioned.
// The first measure lands without a transition (data-ink="ready" turns it
// on), so the pill never sweeps in from the left edge on load.
export function useInk(current: string | null) {
  const nav = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const el = nav.current;
    if (!el) return;
    const place = () => {
      const on = el.querySelector<HTMLElement>("[aria-current]");
      el.dataset.inkShown = on ? "true" : "false";
      if (!on) return;
      el.style.setProperty("--ink-x", `${on.offsetLeft}px`);
      el.style.setProperty("--ink-y", `${on.offsetTop}px`);
      el.style.setProperty("--ink-w", `${on.offsetWidth}px`);
      el.style.setProperty("--ink-h", `${on.offsetHeight}px`);
    };
    place();
    const frame = requestAnimationFrame(() => (el.dataset.ink = "ready"));
    // Fonts swapping in or the nav wrapping changes every item's width.
    const resize = new ResizeObserver(place);
    resize.observe(el);
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
    };
  }, [current]);
  return nav;
}
