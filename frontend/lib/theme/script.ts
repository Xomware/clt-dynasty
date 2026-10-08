// A plain module, not "use client": the layout (a server component) inlines
// THEME_SCRIPT, and a constant imported from a client module arrives as a
// client reference instead of its value.
export type Theme = "xp" | "buzz";

export const THEME_KEY = "clt.theme";

export const isTheme = (v: unknown): v is Theme => v === "xp" || v === "buzz";

// Buzz City replaced Uptown; a browser that picked Uptown keeps its choice.
export const LEGACY: Record<string, Theme> = { uptown: "buzz" };

// Safari tints its toolbars and the overscroll bounce from the page background
// and theme-color, never from the app's own boxes. XP has never set either, so
// only Buzz City does, in its header's ink.
export const BUZZ_CHROME = "#170d31";

// Bowlby One for the chunky display, Barlow Condensed for 90s jersey lettering,
// Barlow for reading and Doto for the arena's dot-matrix boards.
export const BUZZ_FONTS =
  "https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,600;0,700;0,800;1,700;1,800;1,900&family=Barlow:wght@400;500;600;700&family=Bowlby+One&family=Doto:wght@700;900&display=swap";


/**
 * Runs before first paint, so the loaders and the landing are already in the
 * visitor's theme. Buzz City unless XP was chosen, storage refusing included.
 */
export const THEME_SCRIPT = `(function(){var k=${JSON.stringify(THEME_KEY)},v=null;try{v=localStorage.getItem(k);if(v==="uptown"){v="buzz";localStorage.setItem(k,v)}}catch(e){}if(v==="xp")return;try{var h=document.documentElement,m=document.createElement("meta");h.dataset.theme="buzz";h.style.backgroundColor="${BUZZ_CHROME}";m.name="theme-color";m.content="${BUZZ_CHROME}";document.head.append(m);var f=document.createElement("link");f.rel="stylesheet";f.href="${BUZZ_FONTS}";document.head.append(f)}catch(e){}})()`;
