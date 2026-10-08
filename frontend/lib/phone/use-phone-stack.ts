"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { parseOpen, type WindowLink } from "@/lib/desktop/deep-link";
import { patchParams, windowId, type WindowParams } from "@/lib/desktop/windows";
import { crumbLabel } from "@/lib/nav/label";
import { manualScrollRestoration, restoreScroll } from "@/lib/nav/scroll";

const urlOf = (stack: WindowLink[]) => {
  const top = stack.at(-1);
  return top ? `/?open=${windowId(top.kind, top.params)}` : "/";
};

// Screens kept mounted under the top one, so Back finds each as it was left.
export const PHONE_KEEP = 4;

// The phone's screens: a stack over the home screen, each open a browser
// history entry, so the iOS back swipe closes it. Both phone shells share it.
export function usePhoneStack() {
  const [stack, setStack] = useState<WindowLink[]>(() => parseOpen(window.location.search).slice(-1));
  // Screens opened from a deep link have no history entry of ours behind them,
  // so Back pops those itself instead of leaving the site.
  const linked = useRef(stack.length);
  // Where each depth was scrolled when a screen was opened over it; 0 is home.
  const scrolls = useRef<number[]>([]);
  // Names a screen gave itself ("Week 5 Scores"), by depth, for the Back label.
  const [labels, setLabels] = useState<Record<number, string | null>>({});
  const depth = stack.length;
  const was = useRef(depth);

  useEffect(() => {
    // Our entries carry their whole stack, so Forward rebuilds it too;
    // anything else is the program list, or the screens a deep link opened.
    const onPop = (e: PopStateEvent) => {
      const saved = (e.state as { phoneStack?: WindowLink[] } | null)?.phoneStack;
      setStack((s) => saved ?? s.slice(0, Math.max(linked.current, 0)));
    };
    window.addEventListener("popstate", onPop);
    const restore = manualScrollRestoration();
    return () => {
      window.removeEventListener("popstate", onPop);
      restore();
    };
  }, []);

  // A new screen starts at the top; one Back uncovers is where it was left.
  useLayoutEffect(() => {
    if (was.current === depth) return;
    const back = depth < was.current;
    was.current = depth;
    return restoreScroll(back ? (scrolls.current[depth] ?? 0) : 0);
  }, [depth]);

  const open = (link: WindowLink) => {
    const next = [...stack, link];
    scrolls.current[stack.length] = window.scrollY;
    window.history.pushState({ phoneStack: next }, "", urlOf(next));
    setStack(next);
  };

  // Back to `to` screens deep: our own history entries are walked back
  // through, so the browser agrees; ones from a deep link are popped here.
  const unwind = (to: number) => {
    const steps = stack.length - to;
    if (steps <= 0) return;
    const ours = stack.length - linked.current;
    if (steps <= ours) return window.history.go(-steps);
    linked.current = to;
    if (ours > 0) return window.history.go(-ours);
    const next = stack.slice(0, to);
    setStack(next);
    window.history.replaceState(null, "", urlOf(next));
  };

  const patch = (params: WindowParams) => {
    const top = stack.at(-1);
    if (!top) return;
    const next = [...stack.slice(0, -1), { ...top, params: patchParams(top.params, params) }];
    window.history.replaceState({ phoneStack: next }, "", urlOf(next));
    setStack(next);
  };

  const setLabel = useCallback((depth: number, label: string | null) => {
    setLabels((l) => (l[depth] === label ? l : { ...l, [depth]: label }));
  }, []);
  // Depth 0 is the home screen; screen n sits at depth n.
  const labelAt = (depth: number) => (depth <= 0 ? "Home" : (labels[depth] ?? crumbLabel(stack[depth - 1])));

  return {
    stack,
    top: stack.at(-1),
    open,
    back: () => unwind(stack.length - 1),
    // Start goes straight back to the list.
    home: () => unwind(0),
    unwind,
    patch,
    setLabel,
    labelAt,
  };
}
