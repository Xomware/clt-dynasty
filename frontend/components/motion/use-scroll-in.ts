"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";

// A first-load intro still covering the screen. Each theme prerenders its own
// and CSS hides the other, so only a box that renders counts.
const introPlaying = () => [...document.querySelectorAll(".intro, .bzi")].some((el) => el.getClientRects().length > 0);

function subscribe(onChange: () => void) {
  const watch = new MutationObserver(onChange);
  watch.observe(document.body, { childList: true });
  return () => watch.disconnect();
}

/** False while the first-load intro covers the page, so entrances can wait to be seen. */
export const useAfterIntro = () => useSyncExternalStore(subscribe, () => !introPlaying(), () => false);

/**
 * Marks each element matching `selector` inside the returned ref `data-in` the
 * first time it comes into view, once the intro is out of the way. CSS holds
 * each one's entrance until then. Under reduced motion every entrance is off anyway.
 */
export function useScrollIn<T extends HTMLElement>(selector = "[data-scroll]") {
  const root = useRef<T>(null);
  const go = useAfterIntro();
  useEffect(() => {
    const el = root.current;
    if (!el || !go) return;
    const seen = new WeakSet<Element>();
    const shown = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.setAttribute("data-in", "");
          shown.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -12% 0px" },
    );
    const scan = () => {
      for (const target of el.querySelectorAll(selector)) {
        if (seen.has(target)) continue;
        seen.add(target);
        shown.observe(target);
      }
    };
    scan();
    // Sleeper's data lands after mount and brings its own boards.
    const added = new MutationObserver(scan);
    added.observe(el, { childList: true, subtree: true });
    return () => {
      added.disconnect();
      shown.disconnect();
    };
  }, [go, selector]);
  return { root, go };
}
