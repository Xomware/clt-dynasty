"use client";

import { useEffect, useState } from "react";

// Past the first screenful, the phone's bars slide away while the page scrolls
// down and come back on any scroll up. A new screen (`depth`) brings them back.
const SLACK = 8;
const TOP = 96;

export function useHideOnScroll(depth: number): boolean {
  const [hidden, setHidden] = useState(false);
  const [at, setAt] = useState(depth);
  if (at !== depth) {
    setAt(depth);
    setHidden(false);
  }

  useEffect(() => {
    let last = window.scrollY;
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const y = window.scrollY;
        if (y < TOP) setHidden(false);
        else if (y > last + SLACK) setHidden(true);
        else if (y < last - SLACK) setHidden(false);
        else return;
        last = y;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  return hidden;
}
