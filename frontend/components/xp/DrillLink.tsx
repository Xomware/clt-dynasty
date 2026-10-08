"use client";

import { type MouseEvent, type ReactNode, useContext } from "react";

import type { WindowLink } from "@/lib/desktop/deep-link";
import { DrillContext, NavigateContext } from "@/lib/desktop/navigation";

interface DrillLinkProps {
  to: WindowLink;
  children: ReactNode;
  className?: string;
  // An accessible name, when the visible text alone is too little.
  label?: string;
}

// Navigates the window it sits in; Ctrl/Cmd or middle click opens a new one.
export function DrillLink({ to, children, className = "", label }: DrillLinkProps) {
  const open = useContext(DrillContext);
  const navigate = useContext(NavigateContext);
  const onClick = (e: MouseEvent) => (navigate && !e.ctrlKey && !e.metaKey ? navigate(to) : open(to));
  return (
    <button
      type="button"
      className={`xp-drill ${className}`}
      aria-label={label}
      onClick={onClick}
      onAuxClick={(e) => e.button === 1 && open(to)}
    >
      {children}
    </button>
  );
}
