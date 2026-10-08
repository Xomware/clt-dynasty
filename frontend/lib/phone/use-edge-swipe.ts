"use client";

import { type RefObject, useEffectEvent, useLayoutEffect } from "react";

const EDGE = 24;

const standalone = () =>
  window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

// A home-screen web app gets no browser back swipe, so the phone shells draw
// their own: a drag from the left edge pulls the screen along, and letting go
// a third of the way across (or flicking) goes Back. In a browser tab the
// browser's own swipe already walks the history, and a second would go back twice.
// Keyed by the stack's depth: a screen let go of stays pulled off until the
// one under it is shown, then the reset lands before that paints.
export function useEdgeSwipe(target: RefObject<HTMLElement | null>, depth: number, onBack: () => void) {
  const back = useEffectEvent(onBack);

  useLayoutEffect(() => {
    const el = target.current;
    if (depth === 0 || !el || !standalone()) return;
    let start: { x: number; y: number; t: number } | null = null;
    let sideways: boolean | null = null;
    let dx = 0;
    let timer = 0;
    const reset = () => {
      el.style.transition = "";
      el.style.transform = "";
    };
    const settle = (gone: boolean) => {
      el.style.transition = "transform 180ms cubic-bezier(0.2, 0.8, 0.2, 1)";
      el.style.transform = gone ? "translateX(100%)" : "";
      timer = window.setTimeout(gone ? back : reset, 180);
    };
    const down = (e: TouchEvent) => {
      const t = e.touches[0];
      if (e.touches.length !== 1 || t.clientX > EDGE) return;
      start = { x: t.clientX, y: t.clientY, t: e.timeStamp };
      sideways = null;
      dx = 0;
    };
    const move = (e: TouchEvent) => {
      if (!start) return;
      const x = e.touches[0].clientX - start.x;
      const y = e.touches[0].clientY - start.y;
      if (sideways === null && Math.hypot(x, y) > 8) sideways = Math.abs(x) > Math.abs(y);
      if (sideways === false) start = null;
      if (!sideways) return;
      e.preventDefault();
      dx = Math.max(0, x);
      el.style.transition = "none";
      el.style.transform = `translateX(${dx}px)`;
    };
    const up = (e: TouchEvent) => {
      if (!start || !sideways) {
        start = null;
        return;
      }
      const flick = dx > 40 && dx / (e.timeStamp - start.t) > 0.5;
      start = null;
      settle(dx > window.innerWidth / 3 || flick);
    };
    el.addEventListener("touchstart", down, { passive: true });
    el.addEventListener("touchmove", move, { passive: false });
    el.addEventListener("touchend", up);
    el.addEventListener("touchcancel", up);
    return () => {
      clearTimeout(timer);
      reset();
      el.removeEventListener("touchstart", down);
      el.removeEventListener("touchmove", move);
      el.removeEventListener("touchend", up);
      el.removeEventListener("touchcancel", up);
    };
  }, [target, depth]);
}
