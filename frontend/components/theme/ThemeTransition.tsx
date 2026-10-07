import type { CSSProperties } from "react";

import { BrandMark } from "@/components/buzz/BrandMark";
import type { Theme } from "@/lib/theme/script";

import "@/components/intro/intro.css";
import "@/components/buzz/buzz-tokens.css";
import "@/components/buzz/buzz-loader.css";
import "./transition.css";

// Milliseconds from mount: `covered` is when the overlay hides the whole
// screen and the theme swaps under it; `total` is when it is removed. The
// keyframe delays in transition.css are written against these.
export const TIMING: Record<Theme, { covered: number; total: number }> = {
  buzz: { covered: 640, total: 1500 },
  xp: { covered: 540, total: 1450 },
};

// XP to Buzz City: the desktop loses tracking like a VHS tape, slats of the
// road jersey drop over it, the hornet zips across and the league's lockup
// slaps on like a sticker, then the slats roll up off the new page.
function TapeIn() {
  return (
    <>
      <div className="tt-vhs">
        <i />
        <i />
        <i />
      </div>
      <div className="tt-slats">
        {Array.from({ length: 8 }, (_, n) => (
          <i key={n} style={{ "--n": n } as CSSProperties} />
        ))}
      </div>
      <div className="tt-fly">
        <BrandMark mark="head" alt="" className="tt-head" priority />
      </div>
      <div className="tt-mark">
        <BrandMark mark="lockup" alt="" className="tt-lockup" priority />
      </div>
    </>
  );
}

// Buzz City to XP: sunrise floods up from the horizon into XP's Welcome screen,
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
      {to === "buzz" ? <TapeIn /> : <WelcomeBack />}
    </div>
  );
}
