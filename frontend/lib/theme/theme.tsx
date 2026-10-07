"use client";

import { createContext, type ReactNode, useCallback, useContext, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { flushSync } from "react-dom";

import { ThemeTransition, TIMING } from "@/components/theme/ThemeTransition";
import { isTheme, LEGACY, type Theme, THEME_KEY, UPTOWN_CHROME, UPTOWN_FONTS } from "./script";

export type { Theme } from "./script";

// A choice storage refused (some private modes), held for the rest of this visit.
let unsaved: Theme | null = null;
const listeners = new Set<() => void>();

function read(): Theme {
  if (unsaved) return unsaved;
  try {
    const v = localStorage.getItem(THEME_KEY);
    return isTheme(v) ? v : (LEGACY[v ?? ""] ?? "xp");
  } catch {
    return "xp";
  }
}

function write(theme: Theme) {
  try {
    localStorage.setItem(THEME_KEY, theme);
    unsaved = null;
  } catch {
    unsaved = theme;
  }
  for (const l of listeners) l();
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

// The prerendered HTML is always XP. Undefined marks the hydration pass, whose
// guess must not reach <html> and undo what the head script set.
const serverTheme = () => undefined;

// Hydration drops attributes the head script put on <html>, so they are set
// again here. XP has never set any of them, so it gets them removed.
function paintChrome(theme: Theme) {
  const html = document.documentElement;
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (theme === "xp") {
    delete html.dataset.theme;
    html.style.removeProperty("background-color");
    meta?.remove();
    return;
  }
  html.dataset.theme = theme;
  html.style.backgroundColor = UPTOWN_CHROME;
  const tag = meta ?? document.head.appendChild(Object.assign(document.createElement("meta"), { name: "theme-color" }));
  tag.content = UPTOWN_CHROME;
}

async function crossfade(apply: () => void) {
  if (!("startViewTransition" in document)) return apply();
  const root = document.documentElement;
  root.classList.add("theme-fade");
  try {
    await document.startViewTransition(() => flushSync(apply)).finished;
  } finally {
    root.classList.remove("theme-fade");
  }
}

const LABEL: Record<Theme, string> = { xp: "Classic XP", buzz: "Buzz City" };

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  /** True while a switch plays; another switch then is ignored. */
  switching: boolean;
}

const ThemeContext = createContext<ThemeState>({ theme: "xp", setTheme: () => {}, switching: false });

/** This browser's theme, XP until a viewer picks Uptown. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const stored = useSyncExternalStore<Theme | undefined>(subscribe, read, serverTheme);
  const theme = stored ?? "xp";
  const [playing, setPlaying] = useState<Theme | null>(null);
  const [said, setSaid] = useState("");
  const busy = useRef(false);

  useLayoutEffect(() => {
    if (stored !== undefined) paintChrome(stored);
  }, [stored]);

  const setTheme = useCallback(
    (next: Theme) => {
      if (next === theme || busy.current) return;
      busy.current = true;
      const apply = () => {
        write(next);
        setSaid(`${LABEL[next]} theme on`);
      };
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        void crossfade(apply).finally(() => {
          busy.current = false;
        });
        return;
      }
      // The overlay covers the screen before the swap and holds until the new
      // shell has had time to mount under it.
      setPlaying(next);
      setTimeout(apply, TIMING[next].covered);
      setTimeout(() => {
        busy.current = false;
        setPlaying(null);
      }, TIMING[next].total);
    },
    [theme],
  );

  return (
    <ThemeContext value={{ theme, setTheme, switching: playing !== null }}>
      {theme === "buzz" && <link rel="stylesheet" href={UPTOWN_FONTS} precedence="default" />}
      {children}
      {playing && <ThemeTransition to={playing} />}
      <p role="status" className="sr-only">
        {said}
      </p>
    </ThemeContext>
  );
}

export const useTheme = () => useContext(ThemeContext);
