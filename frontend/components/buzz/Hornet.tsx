import { useId } from "react";

interface HornetProps {
  className?: string;
  // Width in px; the art is 120 by 84.
  size?: number;
}

// Buzz City's mascot: an original cartoon hornet, teal and purple, with a
// sticker's white outline. Its wings flap when the parent sets .bz-flap.
export function Hornet({ className = "", size = 120 }: HornetProps) {
  const clip = useId();
  const body = (
    <>
      <path d="M15 49 1 54l14 6z" />
      <ellipse cx="39" cy="53" rx="26" ry="17.5" transform="rotate(-8 39 53)" />
      <circle cx="68" cy="47" r="14" />
      <circle cx="91" cy="40" r="13.5" />
    </>
  );
  return (
    <svg
      viewBox="0 0 120 84"
      width={size}
      height={(size * 84) / 120}
      className={`bz-hornet ${className}`}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <clipPath id={clip}>
          <ellipse cx="39" cy="53" rx="26" ry="17.5" transform="rotate(-8 39 53)" />
        </clipPath>
      </defs>
      <g className="bz-h-outline">{body}</g>
      <g className="bz-h-line" strokeWidth="3" strokeLinecap="round" fill="none">
        <path d="M86 29q-3-14-14-17M95 28q4-14 15-15" />
        <path d="M61 59l-5 11M69 61v11M77 57l6 9" />
      </g>
      <circle cx="72" cy="12" r="3.4" className="bz-h-teal bz-h-line" strokeWidth="2" />
      <circle cx="110" cy="13" r="3.4" className="bz-h-teal bz-h-line" strokeWidth="2" />
      <g className="bz-h-line" strokeWidth="3" strokeLinejoin="round">
        <path d="M15 49 1 54l14 6z" className="bz-h-ink" />
        <ellipse cx="39" cy="53" rx="26" ry="17.5" transform="rotate(-8 39 53)" className="bz-h-teal" />
        <g clipPath={`url(#${clip})`} className="bz-h-purple" stroke="none">
          <rect x="22" y="30" width="8" height="50" transform="rotate(12 26 55)" />
          <rect x="38" y="30" width="8" height="50" transform="rotate(12 42 55)" />
          <rect x="54" y="30" width="8" height="50" transform="rotate(12 58 55)" />
        </g>
        <ellipse cx="39" cy="53" rx="26" ry="17.5" transform="rotate(-8 39 53)" fill="none" />
        <circle cx="68" cy="47" r="14" className="bz-h-purple" />
        <circle cx="91" cy="40" r="13.5" className="bz-h-deep" />
        <ellipse cx="95.5" cy="38" rx="5" ry="6" className="bz-h-eye" strokeWidth="2" />
        <circle cx="97.5" cy="38.5" r="2.6" className="bz-h-ink" stroke="none" />
        <path d="M88 30.5 102 34" fill="none" strokeWidth="3.4" strokeLinecap="round" />
        <path d="M95 48q5 1 8-3" fill="none" strokeWidth="2.4" strokeLinecap="round" />
      </g>
      <g className="bz-wings bz-h-line" strokeWidth="2.5" strokeLinejoin="round">
        <ellipse cx="57" cy="24" rx="19" ry="9" transform="rotate(-28 57 24)" className="bz-h-wing" />
        <ellipse cx="70" cy="21" rx="22" ry="10.5" transform="rotate(-12 70 21)" className="bz-h-wing" />
        <path d="M58 30q8-8 20-10" fill="none" strokeWidth="1.6" opacity="0.6" />
      </g>
    </svg>
  );
}
