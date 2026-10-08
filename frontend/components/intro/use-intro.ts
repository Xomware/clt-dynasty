"use client";

import { type AnimationEvent, useCallback, useEffect, useState, useSyncExternalStore } from "react";

import { markSeen } from "@/lib/intro/seen";

// How long the Skip fade runs before the overlay goes; matches both intros' CSS.
const SKIP_MS = 250;
// Both intros run under 4.5s. If animationend never comes (a background tab
// throttles it, a browser drops it), the page still gets uncovered.
const FALLBACK_MS = 6000;

// The head script hides it before first paint: seen this session, or the
// sign-in callback. The attribute never changes after that.
const hiddenByHead = () => document.documentElement.dataset.intro === "skip";
const noSubscribe = () => () => {};

/**
 * When a server-rendered intro overlay goes: on its own `exit` animation,
 * after a Skip (click, tap or Escape) fades it, or at the fallback. `playing`
 * is false for an intro that isn't this visitor's, which then renders nothing.
 */
export function useIntro(playing: boolean, exit: string) {
  const [phase, setPhase] = useState<"play" | "skip" | "done">("play");
  const hidden = useSyncExternalStore(noSubscribe, hiddenByHead, () => false);
  const live = playing && !hidden;

  const finish = useCallback(() => {
    markSeen();
    setPhase("done");
  }, []);
  const skip = useCallback(() => setPhase((p) => (p === "play" ? "skip" : p)), []);

  useEffect(() => {
    if (!live) return;
    const fallback = setTimeout(finish, FALLBACK_MS);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && skip();
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(fallback);
      window.removeEventListener("keydown", onKey);
    };
  }, [live, finish, skip]);

  useEffect(() => {
    if (phase !== "skip") return;
    const t = setTimeout(finish, SKIP_MS);
    return () => clearTimeout(t);
  }, [phase, finish]);

  const onAnimationEnd = (e: AnimationEvent) => {
    if (e.target === e.currentTarget && e.animationName.startsWith(exit)) finish();
  };

  return { shown: live && phase !== "done", phase, skip, onAnimationEnd };
}
