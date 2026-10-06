"use client";

import type { ComponentType, SVGProps } from "react";

import { type Theme, useTheme } from "@/lib/theme/theme";

import "./theme-toggle.css";

type GlyphProps = SVGProps<SVGSVGElement>;

// A 16px pixel-art XP window: blue title bar, red close box, cream body.
export function XpWindowGlyph(props: GlyphProps) {
  return (
    <svg viewBox="0 0 16 16" width={16} height={16} shapeRendering="crispEdges" aria-hidden focusable="false" {...props}>
      <rect x="1" y="2" width="14" height="12" fill="#0831d9" />
      <rect x="2" y="3" width="12" height="3" fill="#3d95ff" />
      <rect x="11" y="3" width="3" height="3" fill="#e0533a" />
      <rect x="2" y="7" width="12" height="6" fill="#fbf8ec" />
      <rect x="3" y="8" width="5" height="1" fill="#aca899" />
      <rect x="3" y="10" width="7" height="1" fill="#aca899" />
    </svg>
  );
}

// Three Uptown towers, the tallest with the Bank of America crown.
export function SkylineGlyph(props: GlyphProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={16}
      height={16}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
      {...props}
    >
      <path d="M3 21h18M5 21V12h4v9M10 21V6l2-3 2 3v15M15 21V9h4v12" />
    </svg>
  );
}

const OPTIONS: { theme: Theme; label: string; Glyph: ComponentType<GlyphProps> }[] = [
  { theme: "xp", label: "Classic XP", Glyph: XpWindowGlyph },
  { theme: "uptown", label: "Uptown", Glyph: SkylineGlyph },
];

export function ThemeToggle() {
  const { theme, setTheme, switching } = useTheme();
  return (
    <div role="group" aria-label="Theme" className="theme-toggle">
      {OPTIONS.map(({ theme: option, label, Glyph }) => (
        <button key={option} type="button" aria-pressed={theme === option} disabled={switching} onClick={() => setTheme(option)}>
          <Glyph />
          {label}
        </button>
      ))}
    </div>
  );
}
