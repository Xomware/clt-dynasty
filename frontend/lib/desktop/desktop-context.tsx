"use client";

import { createContext, type Dispatch, type ReactNode, useCallback, useContext, useReducer } from "react";

import { recordRecent } from "./recent";
import { REGISTRY, type WindowKind } from "./registry";
import {
  activeWindow,
  defaultLayout,
  desktopReducer,
  TASKBAR_HEIGHT,
  type WindowAction,
  type WindowParams,
  type WindowState,
} from "./windows";

interface Desktop {
  windows: WindowState[];
  active: WindowState | undefined;
  dispatch: Dispatch<WindowAction>;
  // `from` is the window a drill opened this one from, for its Back.
  open: (kind: WindowKind, params?: WindowParams, from?: string) => void;
}

const DesktopContext = createContext<Desktop | null>(null);

export function DesktopProvider({ children }: { children: ReactNode }) {
  const [windows, dispatch] = useReducer(desktopReducer, undefined, defaultLayout);

  const open = useCallback((kind: WindowKind, params: WindowParams = {}, from?: string) => {
    const { defaultSize, drillOnly } = REGISTRY[kind];
    if (!drillOnly) recordRecent(kind);
    const { w, h } = defaultSize;
    const size = { w: Math.min(w, window.innerWidth), h: Math.min(h, window.innerHeight - TASKBAR_HEIGHT) };
    dispatch({ type: "open", kind, params, size, from });
  }, []);

  return <DesktopContext value={{ windows, active: activeWindow(windows), dispatch, open }}>{children}</DesktopContext>;
}

export function useDesktop(): Desktop {
  const desktop = useContext(DesktopContext);
  if (!desktop) throw new Error("useDesktop needs a DesktopProvider");
  return desktop;
}
