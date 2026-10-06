"use client";

import { useLayoutEffect, useRef } from "react";

interface CountUpProps {
  value: number;
  decimals?: number;
  // Shown instead of a value at or below zero, like an unplayed game's "-".
  empty?: string;
  className?: string;
}

const DURATION = 900;
const ease = (t: number) => 1 - (1 - t) ** 3;

// A number that rolls up to its value, from 0 on mount and from the old value
// on a change, like a live score. React renders the final text; the roll only
// rewrites the node in between, and only under Uptown with motion allowed, so
// XP, tests and screen readers get the real number.
export function CountUp({ value, decimals = 0, empty, className = "tabular-nums" }: CountUpProps) {
  const el = useRef<HTMLSpanElement>(null);
  const from = useRef(0);
  const text = (n: number) => (empty !== undefined && n <= 0 ? empty : n.toFixed(decimals));

  useLayoutEffect(() => {
    // React's own text node, edited in place: replacing it would leave React
    // updating a detached node on the next render.
    const node = el.current?.firstChild;
    const start = from.current;
    from.current = value;
    if (!node || start === value || (empty !== undefined && value <= 0)) return;
    if (document.documentElement.dataset.theme !== "uptown" || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const show = (n: number) => (node.nodeValue = n.toFixed(decimals));
    const t0 = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / DURATION);
      show(start + (value - start) * ease(t));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    show(start);
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      show(value);
    };
  }, [value, decimals, empty]);

  return (
    <span ref={el} className={className}>
      {text(value)}
    </span>
  );
}
