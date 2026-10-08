"use client";

import { createContext, useContext, useEffect } from "react";

import type { WindowView } from "@/lib/desktop/windows";
import { settledTeam, windowTitle } from "@/lib/desktop/registry";

// Set by the page or window a view sits in. A view that knows a better name
// for itself than its window title ("Week 5 Scores") hands it up, and the
// back stack's crumbs and Back labels use it.
export const ViewLabelContext = createContext<(label: string | null) => void>(() => {});

export function useViewLabel(label: string | null) {
  const set = useContext(ViewLabelContext);
  useEffect(() => {
    set(label);
    return () => set(null);
  }, [set, label]);
}

// A crumb names what the page shows, not the window: the team, not "Team Profile - team".
export function crumbLabel(view: WindowView): string {
  if (view.kind === "team") {
    const team = settledTeam(view.params);
    if (team) return team.name;
  }
  return windowTitle(view);
}
