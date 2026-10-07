"use client";

import { useEffect, useState } from "react";

import { useReducedMotion } from "@/lib/use-reduced-motion";
import { Hornet } from "./Hornet";
import { TRIVIA } from "./trivia";

import "./buzz-loader.css";

const EVERY = 3600;

// The arena's CRT monitor powering on: a line of light opens into the screen,
// BUZZ CITY slaps on like a sticker and the hornet zips in along its zig-zag.
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
      <div className="bz-crt">
        <div className="bz-crt-screen">
          <i className="bz-crt-court" aria-hidden />
          <svg className="bz-trail" viewBox="0 0 400 120" preserveAspectRatio="none" aria-hidden="true" focusable="false">
            <path d="M0 96 50 40 100 96 150 40 200 96 250 40 300 96 350 40 400 96" pathLength="1" />
          </svg>
          <div className="bz-loader-hornet">
            <Hornet size={112} className="bz-flap" />
          </div>
          <p className="bz-loader-word" aria-hidden="true">
            <span>Buzz</span> <span>City</span>
          </p>
          <p className="bz-loader-kicker" aria-hidden="true">
            CLT Dynasty League
          </p>
          <div className="bz-loader-bar" aria-hidden="true">
            <i />
          </div>
          <p className="bz-loader-label" aria-hidden="true">
            {label}
          </p>
        </div>
        <i className="bz-crt-lines" aria-hidden />
      </div>
      <figure key={n} className="bz-fact">
        <figcaption>Did you know</figcaption>
        <p>{TRIVIA[n]}</p>
      </figure>
    </div>
  );
}
