"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { parseOpen, type WindowLink } from "@/lib/desktop/deep-link";
import { patchParams, windowId, type WindowParams } from "@/lib/desktop/windows";

const urlOf = (stack: WindowLink[]) => {
  const top = stack.at(-1);
  return top ? `/?open=${windowId(top.kind, top.params)}` : "/";
};

// The phone's screens: a stack over the home screen, each open a browser
// history entry, so the iOS back swipe closes it. Both phone shells share it.
export function usePhoneStack() {
  const [stack, setStack] = useState<WindowLink[]>(() => parseOpen(window.location.search).slice(-1));
  // Screens opened from a deep link have no history entry of ours behind them,
  // so Back pops those itself instead of leaving the site.
  const linked = useRef(stack.length);

  useEffect(() => {
    // Our entries carry their stack depth; anything else is the program list.
    const onPop = (e: PopStateEvent) => {
      const depth = (e.state as { phoneDepth?: number } | null)?.phoneDepth ?? linked.current;
      setStack((s) => s.slice(0, Math.max(depth, 0)));
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // A block body: Chromium's scrollTo returns a promise, and an effect must not return one.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [stack.length]);

  const open = useCallback((link: WindowLink) => {
    setStack((s) => {
      const next = [...s, link];
      window.history.pushState({ phoneDepth: next.length }, "", urlOf(next));
      return next;
    });
  }, []);

  const back = () => {
    if (stack.length > linked.current) return window.history.back();
    linked.current = stack.length - 1;
    const next = stack.slice(0, -1);
    setStack(next);
    window.history.replaceState(null, "", urlOf(next));
  };

  const patch = (params: WindowParams) =>
    setStack((s) => {
      const top = s.at(-1);
      if (!top) return s;
      const next = [...s.slice(0, -1), { ...top, params: patchParams(top.params, params) }];
      window.history.replaceState({ phoneDepth: next.length }, "", urlOf(next));
      return next;
    });

  // Start goes straight back to the list, unwinding our own history entries.
  const home = () => {
    const ours = stack.length - linked.current;
    linked.current = 0;
    if (ours > 0) return window.history.go(-ours);
    setStack([]);
    window.history.replaceState(null, "", "/");
  };

  return { stack, top: stack.at(-1), open, back, patch, home };
}
