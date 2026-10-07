import type { CSSProperties } from "react";

interface FlipProps {
  text: string;
  // Stagger offset, so a row of boards flips left to right.
  at?: number;
  className?: string;
}

// A scoreboard number: each character on its own split-flap tile, flipping
// down into place on mount. Screen readers get the plain text.
export function Flip({ text, at = 0, className = "" }: FlipProps) {
  return (
    <span className={`bz-flip ${className}`}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true" className="bz-flip-tiles">
        {[...text].map((ch, i) =>
          ch === " " ? (
            <span key={i} className="bz-flip-gap" />
          ) : (
            <span key={i} className="bz-flip-ch" data-punct={/[.\-–]/.test(ch) || undefined} style={{ "--i": at + i } as CSSProperties}>
              {ch}
            </span>
          ),
        )}
      </span>
    </span>
  );
}
