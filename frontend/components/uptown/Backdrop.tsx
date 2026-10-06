"use client";

import { type CSSProperties, useEffect, useRef } from "react";

import { Skyline } from "@/components/intro/Skyline";

import "@/components/intro/intro.css";

// Seeded, so the server's markup and the client's hydration agree.
function rng(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
}

// Office lights going on and off across uptown, on the skyline's window grid
// (54x120 tiles of 9x12 cells) and clipped to its towers.
const LIGHTS = (() => {
  const r = rng(42);
  return Array.from({ length: 44 }, () => ({
    x: Math.floor(700 / 54 + r() * (1000 / 54)) * 54 + Math.floor(r() * 6) * 9 + 2.5,
    y: 160 + Math.floor(r() * 2.7) * 120 + Math.floor(r() * 10) * 12 + 3,
    cool: r() < 0.2,
    dur: 4 + r() * 9,
    delay: -r() * 12,
  }));
})();

function Twinkles() {
  return (
    <svg viewBox="0 0 2400 500" className="intro-skyline u-twinkles" aria-hidden focusable="false">
      <g clipPath="url(#up-towers)">
        {LIGHTS.map((l, i) => (
          <rect
            key={i}
            x={l.x}
            y={l.y}
            width={3.5}
            height={5}
            className={l.cool ? "fill-(--intro-window-cool)" : "fill-(--intro-window)"}
            style={{ "--dur": `${l.dur.toFixed(1)}s`, "--delay": `${l.delay.toFixed(1)}s` } as CSSProperties}
          />
        ))}
      </g>
    </svg>
  );
}

// The night sky behind every Uptown page, with the skyline lit along the
// bottom. The city sinks a little as the page scrolls, the stars less, so the
// page reads as floating in front of it.
export function Backdrop() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => el.style.setProperty("--scroll", String(Math.min(window.scrollY, 900))));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <div ref={root} className="u-backdrop skyline-palette" aria-hidden>
      <i className="intro-stars" />
      <i className="intro-stars u-stars-twinkle" />
      <div className="u-backdrop-city">
        <div className="u-beams" />
        <Skyline uid="up" />
        <Twinkles />
      </div>
    </div>
  );
}
