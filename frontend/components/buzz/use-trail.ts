"use client";

import { type RefObject, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { parseOpen, type WindowLink } from "@/lib/desktop/deep-link";
import type { GroupId } from "@/lib/desktop/groups";
import { patchParams, viewKey, windowId, type WindowParams } from "@/lib/desktop/windows";
import { crumbLabel } from "@/lib/nav/label";
import { useOpeners } from "@/lib/nav/openers";
import { manualScrollRestoration, restoreScroll } from "@/lib/nav/scroll";
import { firstEntry, nextEntry, readEntry, sameView, type Stop } from "@/lib/nav/trail";
import { groupOf, HOME, urlOf } from "./pages";

export type Dir = "next" | "back" | "in";

export interface Route {
  depth: number;
  view: WindowLink;
  group: GroupId | null;
  dir: Dir;
  // Shown again from the pages kept mounted behind the current one.
  restored: boolean;
}

// Pages kept mounted behind the current one, so Back finds each as it was
// left: its week, its open matchups, its scroll.
const KEEP = 5;

// The XP desktop's link names several windows; the last is the one it had in front.
const fromUrl = (): WindowLink => parseOpen(window.location.search).at(-1) ?? HOME;

const keyOf = (r: Route) => `${r.depth}:${viewKey(r.view.kind, r.view.params)}`;

// Buzz City's desktop pages as a real back stack: every page is a browser
// history entry, so the browser's Back and the shell's agree, and each entry
// carries the path that led to it.
export function useTrail(main: RefObject<HTMLElement | null>) {
  const [nav, setNav] = useState(() => {
    const view = fromUrl();
    const entry = readEntry(window.history.state) ?? firstEntry(groupOf(view, null));
    return { entry, routes: [{ depth: entry.depth, view, group: entry.group, dir: "in" as Dir, restored: false }] };
  });
  const [labels, setLabels] = useState<Record<number, string | null>>({});
  const { entry, routes } = nav;
  const current = routes[routes.length - 1];
  const key = keyOf(current);
  const openers = useOpeners(main);
  const shown = useRef(key);

  const labelOf = (r: Route) => labels[r.depth] ?? crumbLabel(r.view);

  const setLabel = useCallback((depth: number, label: string | null) => {
    setLabels((l) => (l[depth] === label ? l : { ...l, [depth]: label }));
  }, []);

  useEffect(() => {
    const onPop = (e: PopStateEvent) => {
      const view = fromUrl();
      setNav(({ entry, routes }) => {
        const next = readEntry(e.state) ?? firstEntry(groupOf(view, null));
        const dir: Dir = next.depth < entry.depth ? "back" : "next";
        const below = routes.filter((r) => r.depth < next.depth).slice(1 - KEEP);
        const kept = routes.find((r) => r.depth === next.depth && sameView(r.view, view));
        const route = kept ? { ...kept, view, dir, restored: true } : { depth: next.depth, view, group: next.group, dir, restored: false };
        return { entry: next, routes: [...below, route] };
      });
    };
    window.addEventListener("popstate", onPop);
    const restore = manualScrollRestoration();
    return () => {
      window.removeEventListener("popstate", onPop);
      restore();
    };
  }, []);

  // Forward lands at the top; Back where the page was left, focus on the
  // link that left it. The first page keeps the browser's scroll and focus.
  const back = current.dir === "back";
  const restoreY = back ? entry.scrollY : 0;
  useLayoutEffect(() => {
    if (shown.current === key) return;
    shown.current = key;
    const heading = main.current?.querySelector<HTMLElement>(":scope > .bz-route:not([hidden]) h1[tabindex]");
    if (back) openers.focus(Number(key.split(":")[0]), heading);
    else heading?.focus({ preventScroll: true });
    return restoreScroll(restoreY);
  }, [key, back, restoreY, main, openers]);

  const go = (to: WindowLink, { drill, dir }: { drill: boolean; dir: Dir }) => {
    if (windowId(to.kind, to.params) === windowId(current.view.kind, current.view.params)) return;
    const left: Stop = { view: current.view, label: labelOf(current), depth: entry.depth };
    openers.leave(entry.depth);
    window.history.replaceState({ clt: { ...entry, scrollY: window.scrollY } }, "", urlOf(current.view));
    const group = groupOf(to, current.group);
    const next = nextEntry(entry, left, to, group, drill);
    window.history.pushState({ clt: next }, "", urlOf(to));
    const below = routes.filter((r) => r.depth < next.depth).slice(1 - KEEP);
    setNav({ entry: next, routes: [...below, { depth: next.depth, view: to, group, dir, restored: false }] });
  };

  // A tab or filter switch stays on the page, so it replaces the history entry.
  const patch = (params: WindowParams) => {
    const to = { kind: current.view.kind, params: patchParams(current.view.params, params) };
    window.history.replaceState({ clt: entry }, "", urlOf(to));
    setNav({ entry, routes: [...routes.slice(0, -1), { ...current, view: to }] });
  };

  // A crumb on the path is an entry behind this one, so the browser walks back to it.
  const jump = (stop: Stop) => window.history.go(stop.depth - entry.depth);

  return { entry, routes, current, key, keyOf, labelOf, setLabel, go, patch, jump };
}
