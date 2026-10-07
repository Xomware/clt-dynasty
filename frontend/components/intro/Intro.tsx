"use client";

import { useCallback, useEffect, useState, useSyncExternalStore, type AnimationEvent, type CSSProperties } from "react";

import { BrandMark } from "@/components/buzz/BrandMark";
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

      <div className="intro-crest" aria-hidden>
        <BrandMark mark="seal" alt="" className="intro-seal" priority />
        <i className="intro-glint" />
        {SPARKS.map((s, i) => (
          <span
            key={i}
            className="intro-spark"
            style={{ "--dx": s.dx, "--dy": s.dy, animationDelay: `${2.9 + s.delay}s` } as CSSProperties}
          />
        ))}
      </div>
      <div className="intro-crown" aria-hidden>
        <BrandMark mark="crown" alt="" priority />
      </div>

      <p className="intro-tagline" aria-hidden>
        The Queen City&rsquo;s dynasty league
      </p>

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
