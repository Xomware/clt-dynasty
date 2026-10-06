"use client";

import { useCallback, useEffect, useState, useSyncExternalStore, type AnimationEvent, type CSSProperties } from "react";

import { markSeen } from "@/lib/intro/seen";
import { Skyline } from "./Skyline";

import "./intro.css";

// How long the Skip fade runs before the overlay goes; matches intro.css.
const SKIP_MS = 250;
// The full intro is 4.4s. If animationend never comes (a background tab
// throttles it, a browser drops it), the page still gets uncovered.
const FALLBACK_MS = 6000;

const SPARKS = Array.from({ length: 12 }, (_, i) => {
  const a = (i / 12) * Math.PI * 2 + 0.3;
  const r = 0.62 + (i % 3) * 0.14;
  return { dx: Math.cos(a) * r, dy: Math.sin(a) * r * 0.8, delay: (i % 4) * 0.04 };
});

// The head script hides it before first paint: seen this session, or the
// sign-in callback. The attribute never changes after that.
const hiddenByHead = () => document.documentElement.dataset.intro === "skip";
const noSubscribe = () => () => {};

// Server-rendered, so it paints its first frame before any JS runs; the CSS
// drives every beat. This component only decides when to remove it.
export function Intro() {
  const [phase, setPhase] = useState<"play" | "skip" | "done">("play");
  const hidden = useSyncExternalStore(noSubscribe, hiddenByHead, () => false);

  const finish = useCallback(() => {
    markSeen();
    setPhase("done");
  }, []);
  const skip = useCallback(() => setPhase((p) => (p === "play" ? "skip" : p)), []);

  useEffect(() => {
    if (hidden) return;
    const fallback = setTimeout(finish, FALLBACK_MS);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && skip();
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(fallback);
      window.removeEventListener("keydown", onKey);
    };
  }, [hidden, finish, skip]);

  useEffect(() => {
    if (phase !== "skip") return;
    const t = setTimeout(finish, SKIP_MS);
    return () => clearTimeout(t);
  }, [phase, finish]);

  if (hidden || phase === "done") return null;

  const onEnd = (e: AnimationEvent) => {
    if (e.target === e.currentTarget && e.animationName.startsWith("intro-exit")) finish();
  };

  return (
    // Skips on click, not pointerdown: a tap's click would otherwise land on
    // whatever the overlay was covering.
    <div className="intro" data-phase={phase} onClick={skip} onAnimationEnd={onEnd}>
      <div className="intro-sky" aria-hidden>
        <div className="intro-stars" />
      </div>
      <div className="intro-city" aria-hidden>
        <Skyline />
      </div>

      <div className="intro-boot" aria-hidden>
        <p>Queen City</p>
        <div className="intro-boot-track">
          <span />
          <span />
          <span />
        </div>
      </div>

      <div className="intro-crown" aria-hidden>
        <svg viewBox="0 0 16 16" focusable="false">
          <defs>
            <linearGradient id="intro-gold" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="var(--intro-gold-light)" />
              <stop offset="0.55" stopColor="var(--clt-crown)" />
              <stop offset="1" stopColor="var(--clt-crown-dark)" />
            </linearGradient>
            <linearGradient id="intro-glint" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="var(--intro-glint)" stopOpacity={0} />
              <stop offset="0.5" stopColor="var(--intro-glint)" stopOpacity={0.9} />
              <stop offset="1" stopColor="var(--intro-glint)" stopOpacity={0} />
            </linearGradient>
            <clipPath id="intro-crown-shape">
              <path d="M3 9.5 2.5 4l3 2.5L8 2.5l2.5 4 3-2.5-.5 5.5z" />
              <rect x="3" y="10.5" width="10" height="2" />
            </clipPath>
          </defs>
          <rect x="0.5" y="0.5" width="15" height="15" rx="2" className="intro-tile" />
          {/* The league mark's own geometry, from CrownIcon. */}
          <path
            d="M3 9.5 2.5 4l3 2.5L8 2.5l2.5 4 3-2.5-.5 5.5z"
            fill="url(#intro-gold)"
            className="stroke-(--clt-crown-dark) stroke-[0.4]"
            strokeLinejoin="round"
          />
          <rect x="3" y="10.5" width="10" height="2" fill="url(#intro-gold)" className="stroke-(--clt-crown-dark) stroke-[0.4]" />
          <circle cx="8" cy="7.25" r="0.9" className="fill-(--clt-teal)" />
          {/* The skew sits on a wrapper: a CSS transform would replace an SVG transform attribute. */}
          <g clipPath="url(#intro-crown-shape)">
            <g transform="skewX(-18)">
              <rect x="-4" y="0" width="5" height="16" fill="url(#intro-glint)" className="intro-glint" />
            </g>
          </g>
        </svg>
        {SPARKS.map((s, i) => (
          <span
            key={i}
            className="intro-spark"
            style={{ "--dx": s.dx, "--dy": s.dy, animationDelay: `${2.9 + s.delay}s` } as CSSProperties}
          />
        ))}
      </div>

      <div className="intro-word" aria-hidden>
        <p className="intro-name">CLT Dynasty</p>
        <p className="intro-tagline">The Queen City&rsquo;s dynasty league</p>
      </div>

      <button
        type="button"
        className="intro-skip"
        onClick={(e) => {
          e.stopPropagation();
          skip();
        }}
      >
        Skip intro
      </button>
    </div>
  );
}
