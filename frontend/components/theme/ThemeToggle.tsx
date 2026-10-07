"use client";

import type { ReactNode, SVGProps } from "react";

import { BrandMark } from "@/components/buzz/BrandMark";
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

const OPTIONS: { theme: Theme; label: string; glyph: ReactNode }[] = [
  { theme: "xp", label: "Classic XP", glyph: <XpWindowGlyph /> },
  { theme: "buzz", label: "Buzz City", glyph: <BrandMark mark="head" alt="" height={18} /> },
];

export function ThemeToggle() {
  const { theme, setTheme, switching } = useTheme();
  return (
    <div role="group" aria-label="Theme" className="theme-toggle">
      {OPTIONS.map(({ theme: option, label, glyph }) => (
        <button key={option} type="button" aria-pressed={theme === option} disabled={switching} onClick={() => setTheme(option)}>
          {glyph}
          {label}
        </button>
      ))}
    </div>
  );
}
