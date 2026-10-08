"use client";

import { type AnimationEvent, useCallback, useEffect, useState, useSyncExternalStore } from "react";

import { markSeen } from "@/lib/intro/seen";

// How long the Skip fade runs before the overlay goes; matches both intros' CSS.
const SKIP_MS = 250;
// If animationend never comes (a background tab throttles it, a browser
// drops it), the page still gets uncovered this long after the intro starts.
// Comfortably past the XP intro's 4.5s; Buzz City's 5.7s passes its own.
const FALLBACK_MS = 6000;

// The head script hides it before first paint: seen this session, or the
// sign-in callback. The attribute never changes after that.
const hiddenByHead = () => document.documentElement.dataset.intro === "skip";
const noSubscribe = () => () => {};

/**
 * When a server-rendered intro overlay goes: on its own `exit` animation,
 * after a Skip (click, tap or Escape) fades it, or at the fallback. `playing`
 * is false for an intro that isn't this visitor's, which then renders nothing.
 * The phase turns "leave" when the `leave` animation starts (the overlay
 * beginning to uncover the page), so the page can start its entrance under it.
 */
export function useIntro(playing: boolean, exit: string, leave: string, fallbackMs = FALLBACK_MS) {
  const [phase, setPhase] = useState<"play" | "leave" | "skip" | "done">("play");
  const hidden = useSyncExternalStore(noSubscribe, hiddenByHead, () => false);
  const live = playing && !hidden;

  const finish = useCallback(() => {
    markSeen();
    setPhase("done");
  }, []);
  const skip = useCallback(() => setPhase((p) => (p === "play" || p === "leave" ? "skip" : p)), []);

  useEffect(() => {
    if (!live) return;
    const fallback = setTimeout(finish, fallbackMs);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && skip();
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(fallback);
      window.removeEventListener("keydown", onKey);
    };
  }, [live, finish, skip, fallbackMs]);

  useEffect(() => {
    if (phase !== "skip") return;
    const t = setTimeout(finish, SKIP_MS);
    return () => clearTimeout(t);
  }, [phase, finish]);

  const onAnimationEnd = (e: AnimationEvent) => {
    if (e.target === e.currentTarget && e.animationName.startsWith(exit)) finish();
  };

  const onAnimationStart = (e: AnimationEvent) => {
    if (e.animationName === leave) setPhase((p) => (p === "play" ? "leave" : p));
  };

  return { shown: live && phase !== "done", phase, skip, onAnimationStart, onAnimationEnd };
}
