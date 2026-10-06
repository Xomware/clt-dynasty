"use client";

import { type KeyboardEvent, type ReactNode, useEffect, useRef } from "react";

import { LINE, LineIcon } from "./icons";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface MenuDrawerProps {
  id: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

// Slides in from the right. Stays mounted while closed, inert, so it can
// slide out as well as in.
export function MenuDrawer({ id, open, onClose, children }: MenuDrawerProps) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    panel.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    // The page under the drawer would otherwise scroll with the finger.
    const root = document.documentElement;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = "";
      // A row that opened a screen moves focus to its title after this runs.
      opener?.focus();
    };
  }, [open]);

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") return onClose();
    if (e.key !== "Tab") return;
    const all = [...(panel.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])];
    const edge = e.shiftKey ? all[0] : all[all.length - 1];
    if (document.activeElement !== edge) return;
    e.preventDefault();
    (e.shiftKey ? all[all.length - 1] : all[0]).focus();
  };

  return (
    <div className="u-drawer" data-open={open} inert={!open}>
      <div className="u-drawer-scrim" aria-hidden="true" onClick={onClose} />
      <div ref={panel} id={id} role="dialog" aria-modal="true" aria-label="Menu" className="u-drawer-panel" onKeyDown={onKeyDown}>
        <div className="u-drawer-head">
          <h2>Menu</h2>
          <button type="button" className="u-drawer-close" aria-label="Close menu" onClick={onClose}>
            <LineIcon d={LINE.close} />
          </button>
        </div>
        <div className="u-drawer-body">{children}</div>
      </div>
    </div>
  );
}
