"use client";

import { type CSSProperties, useEffect, useRef } from "react";

import { BrandMark } from "@/components/buzz/BrandMark";
import { useStoredTheme } from "@/lib/theme/theme";
import { ledPath, ledWidth } from "./led";
import { useIntro } from "./use-intro";

import "@/components/buzz/buzz-tokens.css";
import "./buzz-intro.css";

const WORD = "CLT DYNASTY";
const COLS = 72;

// The hornet's zig-zag in, as offsets from where it lands: x in vw, y in dvh,
// tilt in degrees, one point every fifth of the flight. The flight keyframes,
// the dotted trail and the trail's reveal all read these, so they stay on one path.
const FLIGHT = [
  [-92, -16, 14],
  [-60, 7, -16],
  [-36, -10, 14],
  [-17, 6, -12],
  [-6, -4, 8],
  [0, 0, 0],
];

const flightVars = Object.fromEntries(
  FLIGHT.flatMap(([x, y, r], i) => [
    [`--x${i}`, `${x}vw`],
    [`--y${i}`, `${y}dvh`],
    [`--r${i}`, `${r}deg`],
    [`--c${i}`, `${((x / FLIGHT[0][0]) * 100).toFixed(2)}%`],
  ]),
) as CSSProperties;

const TRAIL = FLIGHT.map(([x, y]) => `${x} ${y}`).join(" L");

// Confetti off the slam: amber squares, teal diamonds and paper dots, thrown
// wider than tall, as fractions of the lockup's width.
const SPARKS = Array.from({ length: 20 }, (_, i) => {
  const a = (i / 20) * Math.PI * 2 + 0.2;
  const r = 0.5 + ((i * 7) % 5) * 0.07;
  return { dx: Math.cos(a) * r, dy: Math.sin(a) * r * 0.7, spin: (i % 2 ? -1 : 1) * (180 + i * 23), kind: i % 3 };
});

const STREAKS = Array.from({ length: 10 }, (_, i) => (i / 10) * 360 + 9);

// Buzz City's first-load intro, about 4.3s: jersey slats sweep down, the arena
// board flickers on and scrolls the league's name, the hornet zig-zags in and
// the crown drops on it, then the lockup slams down over them with a shake and
// confetti, the ribbon unfurls, a glint runs and the slats wipe away. Server
// rendered like the XP intro and shown by CSS only under data-theme="buzz", so
// a stored Buzz City visitor gets it from the first frame.
// Its marks load lazily: every page carries this stage, and lazy images under
// display:none are never fetched, so XP visitors don't download them.
export function BuzzIntro() {
  // Undefined while hydrating: keep the prerendered stage until the theme is known.
  const theme = useStoredTheme();
  const { shown, phase, skip, onAnimationEnd } = useIntro(theme === undefined || theme === "buzz", "bzi-exit");
  const stage = useRef<HTMLDivElement>(null);

  // WebKit decodes an image the first time it paints, which for the lockup is
  // the frame of the slam, and that frame stalls. Decoding up front moves the
  // cost to the quiet first second; a failed decode only means it happens later.
  useEffect(() => {
    if (!shown) return;
    for (const img of stage.current?.querySelectorAll("img") ?? []) img.decode().catch(() => {});
  }, [shown]);

  if (!shown) return null;

  return (
    // Skips on click, not pointerdown: a tap's click would otherwise land on
    // whatever the overlay was covering.
    <div ref={stage} className="bzi" data-phase={phase} onClick={skip} onAnimationEnd={onAnimationEnd} style={flightVars}>
      <div className="bzi-slats" aria-hidden>
        {Array.from({ length: 8 }, (_, n) => (
          <i key={n} style={{ "--n": n } as CSSProperties} />
        ))}
      </div>

      <div className="bzi-camera" aria-hidden>
        <i className="bzi-glow" />
        <div className="bzi-board-at">
          <div className="bzi-board">
            <div className="bzi-board-dots" style={{ "--cols": COLS } as CSSProperties}>
              <svg
                className="bzi-led"
                viewBox={`0 0 ${ledWidth(WORD)} 7`}
                style={{ "--w": ledWidth(WORD), "--from": COLS, "--to": Math.ceil((COLS - ledWidth(WORD)) / 2) } as CSSProperties}
                focusable="false"
              >
                <path d={ledPath(WORD)} />
              </svg>
            </div>
          </div>
        </div>

        <div className="bzi-slot">
          <svg
            className="bzi-trail"
            viewBox={`${FLIGHT[0][0]} -18 ${-FLIGHT[0][0]} 36`}
            preserveAspectRatio="none"
            style={{ width: `${-FLIGHT[0][0]}vw` }}
            focusable="false"
          >
            <path d={`M${TRAIL}`} />
          </svg>
          <i className="bzi-ring" />
          {STREAKS.map((a) => (
            <i key={a} className="bzi-streak" style={{ "--a": `${a}deg` } as CSSProperties} />
          ))}

          <div className="bzi-fly">
            <div className="bzi-buzz">
              <div className="bzi-mark">
                <BrandMark mark="head" alt="" className="bzi-head" />
                <BrandMark mark="crown" alt="" className="bzi-crown" />
              </div>
            </div>
          </div>

          <div className="bzi-lockup-out">
            <div className="bzi-lockup">
              <BrandMark mark="ribbon" alt="" className="bzi-ribbon" />
              <BrandMark mark="lockup-top" alt="" className="bzi-top" />
              <i className="bzi-glint" />
            </div>
          </div>

          {SPARKS.map((s, i) => (
            <i
              key={i}
              className="bzi-spark"
              data-kind={s.kind}
              style={{ "--dx": s.dx, "--dy": s.dy, "--spin": `${s.spin}deg` } as CSSProperties}
            />
          ))}
        </div>

        <div className="bzi-tape">
          <p>Charlotte, NC &middot; Est. 2024</p>
        </div>
      </div>

      <i className="bzi-flash" aria-hidden />

      <button
        type="button"
        className="bzi-skip"
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
