// The shell's line icons, drawn on a 24-unit grid in the text colour.
export const LINE = {
  search: "M4 11a7 7 0 1 0 14 0a7 7 0 1 0-14 0M20 20l-3.5-3.5",
  menu: "M4 7h16M4 12h16M4 17h16",
  back: "M15 5l-7 7 7 7",
  chevron: "M9 5l7 7-7 7",
  close: "M6 6l12 12M18 6L6 18",
  down: "M6 9l6 6 6-6",
  home: "M3 11l9-7 9 7v9H3z",
  scores: "M3 5h18v12H3zM8 21h8M12 17v4M7 9v4M10 9v4M14 9h3v4h-3z",
  standings: "M5 20V11M12 20V5M19 20v-6",
  bracket: "M4 6h5v4h4v4H9v4H4M13 12h7",
  star: "M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3l-5.5 2.9 1-6.2L3 9.6l6.2-.9z",
};

interface LineIconProps {
  d: string;
  size?: number;
  className?: string;
}

export function LineIcon({ d, size = 22, className }: LineIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path d={d} />
    </svg>
  );
}
