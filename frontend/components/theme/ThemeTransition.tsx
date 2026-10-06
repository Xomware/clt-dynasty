import { Skyline } from "@/components/intro/Skyline";
import type { Theme } from "@/lib/theme/script";

import "@/components/intro/intro.css";
import "./transition.css";

// Milliseconds from mount: `covered` is when the overlay hides the whole
// screen and the theme swaps under it; `total` is when it is removed. The
// keyframe delays in transition.css are written against these.
export const TIMING: Record<Theme, { covered: number; total: number }> = {
  uptown: { covered: 640, total: 1500 },
  xp: { covered: 540, total: 1450 },
};

// XP to Uptown: the desktop greys out as if logging off, night drops over it,
// the skyline rises and lights up, then sky and city part to show Uptown.
function NightFalls() {
  return (
    <>
      <i className="tt-grey" />
      <div className="tt-sky">
        <i className="intro-stars" />
      </div>
      <div className="tt-city">
        <Skyline uid="tt" lightsAt={0.55} />
      </div>
      <div className="tt-mark">
        <svg viewBox="0 0 16 16" className="tt-crown" focusable="false">
          <defs>
            <linearGradient id="tt-gold" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="var(--intro-gold-light)" />
              <stop offset="0.55" stopColor="var(--clt-crown)" />
              <stop offset="1" stopColor="var(--clt-crown-dark)" />
            </linearGradient>
          </defs>
          {/* The league mark's geometry, from CrownIcon. */}
          <path d="M3 9.5 2.5 4l3 2.5L8 2.5l2.5 4 3-2.5-.5 5.5z" fill="url(#tt-gold)" strokeLinejoin="round" />
          <rect x="3" y="10.5" width="10" height="2" fill="url(#tt-gold)" />
          <circle cx="8" cy="7.25" r="0.9" className="fill-(--clt-teal)" />
        </svg>
        <p className="tt-kicker">CLT Dynasty</p>
        <p className="tt-word">Uptown</p>
      </div>
    </>
  );
}

// Uptown to XP: sunrise floods up from the horizon into XP's Welcome screen,
// which dissolves onto the desktop.
function WelcomeBack() {
  return (
    <>
      <i className="tt-dawn" />
      <div className="tt-welcome">
        <i className="tt-band" />
        <div className="tt-welcome-body">
          <p className="tt-welcome-word">welcome</p>
        </div>
        <i className="tt-band tt-band-foot" />
      </div>
    </>
  );
}

// Drawn over everything, and takes the pointer so nothing hidden under it gets clicked.
export function ThemeTransition({ to }: { to: Theme }) {
  return (
    <div className="theme-transition skyline-palette" data-to={to} aria-hidden="true">
      {to === "uptown" ? <NightFalls /> : <WelcomeBack />}
    </div>
  );
}
