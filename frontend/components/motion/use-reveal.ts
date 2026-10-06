"use client";

import { useEffect, useRef } from "react";

// Uptown's cards: Home's, the Keep going row, and each page's top-level groups.
export const REVEAL = ".home-card, .u-related, .u-panel .xp-group:not(.xp-group .xp-group), .up-page .xp-group:not(.xp-group .xp-group)";

// Cards that mount below the fold wait (data-reveal="wait", styled hidden)
// until they scroll into view, then rise in (data-reveal="in"). Anything
// already on screen keeps its mount entrance and is never hidden, so a slow
// observer can only ever cost an animation, not content. Watches inside the
// element given the returned ref.
export function useReveal<T extends HTMLElement>(selector: string) {
  const root = useRef<T>(null);
  useEffect(() => {
    const el = root.current;
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const seen = new WeakSet<Element>();
    const shown = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.setAttribute("data-reveal", "in");
          shown.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    const scan = () => {
      for (const card of el.querySelectorAll(selector)) {
        if (seen.has(card)) continue;
        seen.add(card);
        if (card.getBoundingClientRect().top < window.innerHeight) continue;
        card.setAttribute("data-reveal", "wait");
        shown.observe(card);
      }
    };
    scan();
    const added = new MutationObserver(scan);
    added.observe(el, { childList: true, subtree: true });
    return () => {
      added.disconnect();
      shown.disconnect();
    };
  }, [selector]);
  return root;
}
