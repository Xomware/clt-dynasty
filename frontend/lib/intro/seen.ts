// A plain module, not "use client": the layout (a server component) inlines
// HEAD_SCRIPT, and a constant imported from a client module arrives as a
// client reference instead of its value.
export const SEEN_KEY = "clt.intro.seen";

// Runs in <head> before first paint, so a visitor who has seen the intro this
// session, or is landing on the sign-in callback, never gets a frame of it.
export const HEAD_SCRIPT = `try{if(sessionStorage.getItem(${JSON.stringify(SEEN_KEY)})||location.pathname.indexOf("/auth/")===0)document.documentElement.dataset.intro="skip"}catch(e){}`;

export function markSeen() {
  try {
    sessionStorage.setItem(SEEN_KEY, "1");
  } catch {
    // Private mode can refuse storage; the intro then plays again next load.
  }
}
