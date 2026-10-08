"use client";

import { type CSSProperties, useEffect, useRef, useState } from "react";

import { BrandMark } from "@/components/buzz/BrandMark";
import { type IntroWeek, introWeek } from "@/lib/intro/week";
import { isMuted, setMuted } from "@/lib/sound/sound";
import { useStoredTheme } from "@/lib/theme/theme";
import { playArena } from "./arena-sound";
import { runArena } from "./arena";
import { ledPath, ledWidth } from "./led";
import { useIntro } from "./use-intro";

import "@/components/buzz/buzz-tokens.css";
import "./buzz-intro.css";

const RIBBON = "CLT DYNASTY * CHARLOTTE NC * EST 2024 * TWELVE TEAMS * SUPERFLEX * ";
const COUNT = ["3", "2", "1"];
// The games only join if they're in hand this far in, before the lockup rises for them.
const WEEK_BY = 3.6;

// The hornet's run at the camera, as offsets from where it lands: x in vw, y
// in dvh, scale and tilt, one point every fifth of the flight. It leaves the
// board small and zig-zags in, growing, to overshoot and land.
const FLIGHT = [
  [0, -4, 0.12, 0],
  [-24, -14, 0.3, -20],
  [22, -6, 0.52, 18],
  [-15, 5, 0.78, -14],
  [7, -2, 1.02, 9],
  [0, 0, 1.14, 0],
];

const flightVars = Object.fromEntries(
  FLIGHT.flatMap(([x, y, s, r], i) => [
    [`--x${i}`, `${x}vw`],
    [`--y${i}`, `${y}dvh`],
    [`--s${i}`, s],
    [`--r${i}`, `${r}deg`],
  ]),
) as CSSProperties;

function Led({ text, className }: { text: string; className?: string }) {
  return (
    <svg className={className} viewBox={`0 0 ${ledWidth(text)} 7`} style={{ "--w": ledWidth(text) } as CSSProperties} focusable="false">
      <path d={ledPath(text)} />
    </svg>
  );
}

// One split-flap digit change: the old top half falls away, the new bottom half drops into place.
function Flip({ value, from, i }: { value: string; from: string | null; i: number }) {
  return (
    <>
      <span className="bzi-half bzi-half-top" style={{ "--i": i } as CSSProperties}>
        <Led text={value} />
      </span>
      {from && (
        <span className="bzi-half bzi-half-top bzi-fall" style={{ "--i": i } as CSSProperties}>
          <Led text={from} />
        </span>
      )}
      <span className="bzi-half bzi-half-bot bzi-drop" style={{ "--i": i } as CSSProperties}>
        <Led text={value} />
      </span>
    </>
  );
}

function Card({ game, i }: { game: IntroWeek["games"][number]; i: number }) {
  const lead = game[0].points === game[1].points ? -1 : game[0].points > game[1].points ? 0 : 1;
  return (
    <li className="bzi-card" style={{ "--i": i } as CSSProperties}>
      {game.map((side, n) => (
        <div key={n} className="bzi-side" data-lead={n === lead || undefined}>
          {side.avatarUrl ? (
            // Eager and decoded as soon as the games arrive (below): a team's
            // upload can be full size, and decoding it on the frame the cards
            // land stalls WebKit. next/image would load it lazily instead.
            // eslint-disable-next-line @next/next/no-img-element
            <img className="bzi-avatar" src={side.avatarUrl} alt="" />
          ) : (
            <span className="bzi-avatar">{side.name.charAt(0).toUpperCase()}</span>
          )}
          <span className="bzi-team">{side.name}</span>
          <Led className="bzi-score" text={side.points.toFixed(1)} />
        </div>
      ))}
    </li>
  );
}

const SpeakerIcon = ({ on }: { on: boolean }) => (
  <svg viewBox="0 0 20 20" aria-hidden focusable="false">
    <path d="M3 7.5h3l4-3.5v12l-4-3.5H3z" fill="currentColor" />
    {on ? (
      <path d="M13 6.5a5 5 0 0 1 0 7M15.5 4a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    ) : (
      <path d="m13.5 7.5 5 5m0-5-5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    )}
  </svg>
);

// Seconds into the intro, read off the stage's own exit animation, which
// starts with the first frame; null once a Skip has replaced it.
function introClock(el: HTMLElement | null): number | null {
  const a = el?.getAnimations?.().find((x) => (x as CSSAnimation).animationName === "bzi-exit");
  return a && a.currentTime !== null ? Number(a.currentTime) / 1000 : null;
}

// Buzz City's first-load intro, about 5.7s, an arena's player introduction:
// a spotlight sweeps the dark arena, LED ribbons light the edges, the board
// counts down 3-2-1, the hornet bursts out of it at the camera, takes its
// crown, the lockup slams onto the jersey with confetti, then this week's real
// games land as scoreboard cards before the slats wipe to the page. Server
// rendered and shown by CSS under data-theme="buzz", so a Buzz City visitor
// gets it from the first frame; the canvases and the games join on hydration,
// on the stage's own CSS clock. Its marks load lazily: lazy images under
// display:none are never fetched, so XP visitors don't download them.
export function BuzzIntro() {
  // Undefined while hydrating: keep the prerendered stage until the theme is known.
  const theme = useStoredTheme();
  // The page starts its entrance as the slats start to clear.
  const { shown, phase, skip, onAnimationStart, onAnimationEnd } = useIntro(theme === undefined || theme === "buzz", "bzi-exit", "bzi-slat-up", 7500);
  const stage = useRef<HTMLDivElement>(null);
  const bg = useRef<HTMLCanvasElement>(null);
  const fx = useRef<HTMLCanvasElement>(null);
  const [week, setWeek] = useState<{ data: IntroWeek; late: number } | null>(null);
  const [sound, setSound] = useState(false);
  const stopSound = useRef<(() => void) | null>(null);
  const live = shown && theme === "buzz";

  // WebKit decodes an image the first time it paints, which for the lockup is
  // the frame of the slam, and that frame stalls. Decoding up front moves the
  // cost to the quiet countdown; a failed decode only means it happens later.
  // The games' avatars mount later, so this runs again for them.
  useEffect(() => {
    if (!live) return;
    for (const img of stage.current?.querySelectorAll("img") ?? []) img.decode().catch(() => {});
  }, [live, week]);

  useEffect(() => {
    const el = stage.current;
    // No CSS clock (no animations at all, as in jsdom) means nothing to sync to.
    if (!live || !el || introClock(el) === null || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let on = true;
    introWeek()
      .then((data) => {
        const t = introClock(el);
        if (on && data && t !== null && t < WEEK_BY) setWeek({ data, late: t });
      })
      .catch(() => {});
    const stop = runArena({
      bg: bg.current!,
      fx: fx.current!,
      clock: () => introClock(el),
      hornet: el.querySelector(".bzi-buzz")!,
      lockup: el.querySelector(".bzi-lockup")!,
      cards: () => [...el.querySelectorAll(".bzi-card")],
    });
    return () => {
      on = false;
      stop();
    };
  }, [live]);

  // Sound only ever starts from a tap on the intro's speaker, or when this
  // tab has already been interacted with and the visitor hasn't muted the site.
  useEffect(() => {
    if (!live || isMuted() || !navigator.userActivation?.hasBeenActive || typeof AudioContext === "undefined") return;
    const t = introClock(stage.current);
    if (t === null) return;
    stopSound.current = playArena(t);
    setSound(true);
  }, [live]);

  useEffect(() => {
    if (phase === "play" || phase === "leave") return;
    stopSound.current?.();
    stopSound.current = null;
  }, [phase]);
  useEffect(() => () => stopSound.current?.(), []);

  const toggleSound = () => {
    if (sound) {
      stopSound.current?.();
      stopSound.current = null;
      setMuted(true);
      setSound(false);
      return;
    }
    const t = introClock(stage.current);
    setMuted(false);
    setSound(true);
    if (t !== null && typeof AudioContext !== "undefined") stopSound.current = playArena(t);
  };

  if (!shown) return null;

  return (
    // Skips on click, not pointerdown: a tap's click would otherwise land on
    // whatever the overlay was covering.
    <div
      ref={stage}
      className="bzi"
      data-phase={phase}
      data-week={week ? "" : undefined}
      onClick={skip}
      onAnimationStart={onAnimationStart}
      onAnimationEnd={onAnimationEnd}
      style={{ ...flightVars, ...(week && { "--late": `${week.late}s` }) } as CSSProperties}
    >
      <canvas ref={bg} className="bzi-bg" aria-hidden />

      <div className="bzi-slats" aria-hidden>
        {Array.from({ length: 8 }, (_, n) => (
          <i key={n} style={{ "--n": n } as CSSProperties} />
        ))}
      </div>

      <div className="bzi-camera" aria-hidden>
        <div className="bzi-board-at">
          <div className="bzi-board">
            <Led className="bzi-board-label" text="KICKOFF IN" />
            <div className="bzi-flip">
              {COUNT.map((v, i) => (
                <Flip key={v} value={v} from={COUNT[i - 1] ?? null} i={i} />
              ))}
            </div>
          </div>
        </div>

        <div className="bzi-slot">
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
        </div>

        <div className="bzi-tape">
          <p>Charlotte, NC &middot; Est. 2024</p>
        </div>

        {week && (
          <div className="bzi-week">
            <Led className="bzi-week-label" text={week.data.label} />
            <ol className="bzi-games">
              {week.data.games.map((g, i) => (
                <Card key={i} game={g} i={i} />
              ))}
            </ol>
          </div>
        )}
      </div>

      <div className="bzi-ribbons" aria-hidden>
        {(["top", "bottom"] as const).map((edge) => (
          <div key={edge} className={`bzi-rail bzi-rail-${edge}`}>
            <div className="bzi-rail-text">
              <Led text={RIBBON + RIBBON} />
            </div>
          </div>
        ))}
        <div className="bzi-rail bzi-rail-left" />
        <div className="bzi-rail bzi-rail-right" />
      </div>

      <canvas ref={fx} className="bzi-fx" aria-hidden />
      <i className="bzi-flash" aria-hidden />

      <button
        type="button"
        className="bzi-btn bzi-sound"
        aria-pressed={sound}
        onClick={(e) => {
          e.stopPropagation();
          toggleSound();
        }}
      >
        <SpeakerIcon on={sound} />
        <span className="sr-only">Arena sound</span>
      </button>
      <button
        type="button"
        className="bzi-btn bzi-skip"
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
