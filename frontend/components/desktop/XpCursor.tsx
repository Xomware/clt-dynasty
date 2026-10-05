"use client";

import { useEffect } from "react";

// On body rather than .xp-desktop: the taskbar and the dialogs portaled to body
// sit outside it.
export function XpCursor() {
  useEffect(() => {
    document.body.classList.add("xp-cursor");
    return () => document.body.classList.remove("xp-cursor");
  }, []);
  return null;
}
