"use client";

import { type KeyboardEvent, type ReactNode, useEffect, useRef } from "react";

import { LINE, LineIcon } from "./line-icons";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface SheetProps {
  id: string;
  label: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

// The phone's bottom sheet, over the tab bar. Stays mounted while closed,
// inert, so it can slide down as well as up.
export function Sheet({ id, label, open, onClose, children }: SheetProps) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement as HTMLElement | null;
    panel.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    // The page under the sheet would otherwise scroll with the finger.
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
    <div className="u-sheet" data-open={open} inert={!open}>
      <div className="u-sheet-scrim" aria-hidden="true" onClick={onClose} />
      <div ref={panel} id={id} role="dialog" aria-modal="true" aria-label={label} className="u-sheet-panel" onKeyDown={onKeyDown}>
        <div className="u-sheet-head">
          <h2>{label}</h2>
          <button type="button" className="u-sheet-close" aria-label={`Close ${label.toLowerCase()}`} onClick={onClose}>
            <LineIcon d={LINE.close} />
          </button>
        </div>
        <div className="u-sheet-body">{children}</div>
      </div>
    </div>
  );
}
