"use client";

import { createContext, type ReactNode, useCallback, useContext, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { flushSync } from "react-dom";

import { ThemeTransition, TIMING } from "@/components/theme/ThemeTransition";
import { play } from "@/lib/sound/sound";
import { isTheme, LEGACY, type Theme, THEME_KEY, BUZZ_CHROME, BUZZ_FONTS } from "./script";

export type { Theme } from "./script";

// A choice storage refused (some private modes), held for the rest of this visit.
let unsaved: Theme | null = null;
const listeners = new Set<() => void>();

function read(): Theme {
  if (unsaved) return unsaved;
  try {
    const v = localStorage.getItem(THEME_KEY);
    return isTheme(v) ? v : (LEGACY[v ?? ""] ?? "buzz");
  } catch {
    return "buzz";
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

// Undefined marks the hydration pass: the prerendered HTML can't know the
// theme, so its guess must not reach <html> and undo what the head script set.
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
  html.style.backgroundColor = BUZZ_CHROME;
  const tag = meta ?? document.head.appendChild(Object.assign(document.createElement("meta"), { name: "theme-color" }));
  tag.content = BUZZ_CHROME;
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

// Calls back once two frames in a row come in under 24ms, or after `max`:
// mounting a whole shell stalls the main thread, and an animation started
// during the stall stutters.
function whenSmooth(max: number, done: () => void) {
  let last = 0;
  let good = 0;
  let start = 0;
  const frame = (t: number) => {
    start ||= t;
    good = last && t - last < 24 ? good + 1 : 0;
    last = t;
    if (good >= 2 || t - start >= max) return done();
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

const LABEL: Record<Theme, string> = { xp: "Classic XP", buzz: "Buzz City" };

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  /** True while a switch plays; another switch then is ignored. */
  switching: boolean;
}

const ThemeContext = createContext<ThemeState>({ theme: "buzz", setTheme: () => {}, switching: false });

/** This browser's theme, Buzz City until a viewer picks Classic XP. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const stored = useStoredTheme();
  const theme = stored ?? "buzz";
  const [playing, setPlaying] = useState<{ to: Theme; phase: "in" | "out"; snapshot: boolean } | null>(null);
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
      // shell has mounted under it and the frames run smooth again.
      const { covered, hold, out, total } = TIMING[next];
      const run = (snapshot: boolean) => {
        const started = performance.now();
        setPlaying({ to: next, phase: "in", snapshot });
        setTimeout(() => {
          apply();
          whenSmooth(total - out - covered, () => {
            setTimeout(
              () => {
                setPlaying((p) => p && { ...p, phase: "out" });
                // XP's chime sounds as its desktop comes up.
                if (next === "xp") play("startup");
                setTimeout(() => {
                  busy.current = false;
                  setPlaying(null);
                }, out);
              },
              Math.max(0, hold - (performance.now() - started)),
            );
          });
        }, covered);
      };
      // To XP the page itself powers down: a View Transition captures it and
      // CSS squeezes the capture to a line over the boot screen.
      if (next !== "xp" || !("startViewTransition" in document)) return run(false);
      const root = document.documentElement;
      root.classList.add("theme-crt");
      void document
        .startViewTransition(() => flushSync(() => run(true)))
        .finished.finally(() => root.classList.remove("theme-crt"));
    },
    [theme],
  );

  return (
    <ThemeContext value={{ theme, setTheme, switching: playing !== null }}>
      {(stored === "buzz" || playing?.to === "buzz") && <link rel="stylesheet" href={BUZZ_FONTS} precedence="default" />}
      {children}
      {playing && <ThemeTransition {...playing} />}
      <p role="status" className="sr-only">
        {said}
      </p>
    </ThemeContext>
  );
}

export const useTheme = () => useContext(ThemeContext);

/** The stored theme, or undefined during hydration, when the prerendered HTML must be matched. */
export const useStoredTheme = () => useSyncExternalStore<Theme | undefined>(subscribe, read, serverTheme);
