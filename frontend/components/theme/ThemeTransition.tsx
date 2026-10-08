import type { CSSProperties } from "react";

import { BrandMark } from "@/components/buzz/BrandMark";
import type { Theme } from "@/lib/theme/script";

import "@/components/buzz/buzz-tokens.css";
import "@/components/buzz/buzz-loader.css";
import "./transition.css";

// Milliseconds from mount: `covered` is when the overlay hides the whole
// screen and the theme swaps under it. The cover holds at least until `hold`,
// and on until the new shell has mounted and the frames run smooth again
// (`settle` at most), then plays its `out` and goes. `total` is the latest it
// can be gone. The keyframe delays in transition.css are written against these.
const SETTLE = 400;
const timing = (covered: number, hold: number, out: number) => ({ covered, hold, out, total: hold + SETTLE + out });
export const TIMING: Record<Theme, ReturnType<typeof timing>> = {
  buzz: timing(640, 1040, 560),
  xp: timing(900, 1800, 500),
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

// Buzz City to XP, the way a 2003 PC came back: the arena powers down like
// a CRT, squeezed to a line that shrinks to a dot, then the boot screen with
// the league's seal and the green progress blocks, the Welcome screen with a
// light sweeping across it, and the desktop coming up under the startup chime.
// With View Transitions it is the page itself that squeezes; without, black
// shutters close over it.
function PowerCycle() {
  return (
    <>
      <i className="tt-crt" />
      <i className="tt-crt-flash" />
      <i className="tt-crt-line" />
      <div className="tt-boot">
        <BrandMark mark="seal" alt="" className="tt-boot-seal" priority />
        <p className="tt-boot-name">
          CLT Dynasty<span>League</span>
        </p>
        <div className="tt-boot-bar">
          <i />
        </div>
      </div>
      <div className="tt-welcome">
        <i className="tt-band" />
        <div className="tt-welcome-body">
          <i className="tt-sweep" />
          <p className="tt-welcome-word">welcome</p>
        </div>
        <i className="tt-band tt-band-foot" />
      </div>
    </>
  );
}

interface ThemeTransitionProps {
  to: Theme;
  // "out" once the new shell has settled under the cover.
  phase: "in" | "out";
  // The old page was captured by a View Transition and squeezes itself.
  snapshot: boolean;
}

// Drawn over everything, and takes the pointer so nothing hidden under it gets clicked.
export function ThemeTransition({ to, phase, snapshot }: ThemeTransitionProps) {
  return (
    <div
      className="theme-transition"
      data-to={to}
      data-phase={phase}
      data-crt={to === "xp" ? (snapshot ? "snapshot" : "shutter") : undefined}
      aria-hidden="true"
    >
      {to === "buzz" ? <TapeIn /> : <PowerCycle />}
    </div>
  );
}
