"use client";

import type { CSSProperties } from "react";

import { BrandMark } from "@/components/buzz/BrandMark";
import { useStoredTheme } from "@/lib/theme/theme";
import { Skyline } from "./Skyline";
import { useIntro } from "./use-intro";

import "./intro.css";

const SPARKS = Array.from({ length: 12 }, (_, i) => {
  const a = (i / 12) * Math.PI * 2 + 0.3;
  const r = 0.62 + (i % 3) * 0.14;
  return { dx: Math.cos(a) * r, dy: Math.sin(a) * r * 0.8, delay: (i % 4) * 0.04 };
});

// Server-rendered, so it paints its first frame before any JS runs; the CSS
// drives every beat. This component only decides when to remove it. Buzz City
// has its own intro, and CSS hides this one under it before hydration.
export function Intro() {
  const { shown, phase, skip, onAnimationEnd } = useIntro(useStoredTheme() !== "buzz", "intro-exit");
  if (!shown) return null;

  return (
    // Skips on click, not pointerdown: a tap's click would otherwise land on
    // whatever the overlay was covering.
    <div className="intro" data-phase={phase} onClick={skip} onAnimationEnd={onAnimationEnd}>
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
