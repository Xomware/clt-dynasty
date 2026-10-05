"use client";

import { createContext } from "react";

import type { WindowLink } from "./deep-link";

// The window manager provides the real opener; outside it a drill does nothing.
export const DrillContext = createContext<(to: WindowLink) => void>(() => {});

// Set by the window a link sits in, so a plain click navigates that window in
// place. Outside any window it is null and every drill opens a new window.
export const NavigateContext = createContext<((to: WindowLink) => void) | null>(null);
