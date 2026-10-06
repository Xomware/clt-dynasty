// A plain module, not "use client": the layout (a server component) inlines
// THEME_SCRIPT, and a constant imported from a client module arrives as a
// client reference instead of its value.
export type Theme = "xp" | "uptown";

export const THEME_KEY = "clt.theme";

export const isTheme = (v: unknown): v is Theme => v === "xp" || v === "uptown";

// Safari tints its toolbars and the overscroll bounce from the page background
// and theme-color, never from the app's own boxes. XP has never set either, so
// only Uptown does.
export const UPTOWN_CHROME = "#0a1838";

export const UPTOWN_FONTS = "https://fonts.googleapis.com/css2?family=Figtree:wght@400;500;600;700;800&family=Sora:wght@600;700;800&display=swap";

/** Runs before first paint, so the loaders and the landing are already in the stored theme. */
export const THEME_SCRIPT = `try{if(localStorage.getItem(${JSON.stringify(THEME_KEY)})==="uptown"){var h=document.documentElement,m=document.createElement("meta");h.dataset.theme="uptown";h.style.backgroundColor="${UPTOWN_CHROME}";m.name="theme-color";m.content="${UPTOWN_CHROME}";document.head.append(m)}}catch(e){}`;
