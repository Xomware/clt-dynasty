"use client";

import { useEffect, useState } from "react";

import { useReducedMotion } from "@/lib/use-reduced-motion";
import { BrandMark } from "./BrandMark";
import { TRIVIA } from "./trivia";

import "./buzz-loader.css";

const EVERY = 3600;

// The hornet buzzes in along a zig-zag, the crown drops onto its head and the
// wordmark slaps on under it, a glint running over it now and then, all on the
// road jersey.
// Charlotte trivia rotates underneath while the app loads. BrandLoader draws it
// beside XP's, and CSS shows the one for the theme on <html>, so the
// prerendered page is already right before hydration.
export function BuzzLoader({ label }: { label: string }) {
  const still = useReducedMotion();
  const [n, setN] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setN((i) => (i + 1) % TRIVIA.length), still ? EVERY * 2 : EVERY);
    return () => clearInterval(t);
  }, [still]);

  return (
    <div className="bz-loader">
      <div className="bz-ld-stage" aria-hidden="true">
        <svg className="bz-ld-trail" viewBox="0 0 400 120" preserveAspectRatio="none" focusable="false">
          <path d="M0 96 50 40 100 96 150 40 200 96 250 40 300 96 350 40 400 96" pathLength="1" />
        </svg>
        <div className="bz-ld-fly">
          <div className="bz-ld-buzz">
            <div className="bz-ld-mark">
              <BrandMark mark="head" alt="" className="bz-ld-head" priority />
              <BrandMark mark="crown" alt="" className="bz-ld-crown" priority />
            </div>
          </div>
        </div>
        <div className="bz-ld-word">
          <BrandMark mark="wordmark" alt="" className="bz-ld-wordmark" priority />
          <i className="bz-ld-glint" />
        </div>
      </div>
      <div className="bz-loader-bar" aria-hidden="true">
        <i />
      </div>
      <p className="bz-loader-label" aria-hidden="true">
        {label}
      </p>
      <figure key={n} className="bz-fact">
        <figcaption>Did you know</figcaption>
        <p>{TRIVIA[n]}</p>
      </figure>
    </div>
  );
}
