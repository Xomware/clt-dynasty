import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function Icon({ children, ...props }: IconProps) {
  return (
    <svg viewBox="0 0 16 16" width={16} height={16} aria-hidden focusable="false" {...props}>
      {children}
    </svg>
  );
}

// The league mark: Charlotte's Queen City crown on a navy tile.
export function CrownIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="0.5" y="0.5" width="15" height="15" rx="2" className="fill-(--clt-navy) stroke-(--clt-navy-dark)" />
      <path d="M3 9.5 2.5 4l3 2.5L8 2.5l2.5 4 3-2.5-.5 5.5z" className="fill-(--clt-crown) stroke-(--clt-crown-dark) stroke-[0.75]" strokeLinejoin="round" />
      <rect x="3" y="10.5" width="10" height="2" className="fill-(--clt-crown) stroke-(--clt-crown-dark) stroke-[0.75]" />
      <circle cx="8" cy="7.25" r="0.9" className="fill-(--clt-teal)" />
    </Icon>
  );
}

export function TrophyIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3.5 2.5h9v3a4.5 4.5 0 0 1-9 0z" className="fill-(--xp-gold) stroke-(--xp-wood)" />
      <path d="M3.5 3.5h-2v1a2.5 2.5 0 0 0 2.5 2.5M12.5 3.5h2v1a2.5 2.5 0 0 1-2.5 2.5" className="fill-none stroke-(--xp-wood)" />
      <path d="M7 10h2v2.5H7z" className="fill-(--xp-gold) stroke-(--xp-wood)" />
      <rect x="4.5" y="12.5" width="7" height="2" className="fill-(--xp-wood)" />
      <path d="M6 4v2" className="stroke-(--xp-cream)" />
    </Icon>
  );
}

export function HomeIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M1.5 8L8 2l6.5 6" className="fill-none stroke-(--xp-red) stroke-2" />
      <path d="M3.5 7.5v7h9v-7" className="fill-(--xp-cream) stroke-(--xp-text)" />
      <rect x="6.5" y="10" width="3" height="4.5" className="fill-(--xp-wood)" />
    </Icon>
  );
}

// The Uptown theme: the skyline at night, its tallest tower crowned gold.
export function UptownIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="0.5" y="0.5" width="15" height="15" rx="2" className="fill-(--clt-navy) stroke-(--clt-navy-dark)" />
      <path d="M2 14.5V9h3v5.5zM6 14.5V4.5L7.5 3 9 4.5v10zM10 14.5V7h3.5v7.5z" className="fill-(--clt-teal) stroke-(--clt-navy-dark) stroke-[0.5]" />
      <path d="M6.5 3.5h2" className="stroke-(--clt-crown)" />
      <path d="M3 10.5h1M7 6.5h1M7 9h1M7 11.5h1M11 8.5h1M11 11h1" className="stroke-(--clt-crown)" />
    </Icon>
  );
}

export function DesktopIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="1.5" y="2.5" width="13" height="9" className="fill-(--xp-title-light) stroke-(--xp-text)" />
      <path d="M6 14.5h4M8 11.5v3" className="stroke-(--xp-text)" />
    </Icon>
  );
}

export function ScoresIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="1.5" y="2.5" width="13" height="9" className="fill-(--xp-screen) stroke-(--xp-text)" />
      <path d="M4 9V5h2v4M10 5h2v4h-2" className="fill-none stroke-(--xp-lime)" />
      <path d="M8 6v.5M8 8v.5" className="stroke-(--xp-lime)" />
      <path d="M5.5 14.5h5M8 11.5v3" className="stroke-(--xp-text)" />
    </Icon>
  );
}

export function StandingsIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="1.5" y="8.5" width="4" height="6" className="fill-(--xp-silver) stroke-(--xp-text)" />
      <rect x="5.5" y="4.5" width="5" height="10" className="fill-(--xp-gold) stroke-(--xp-text)" />
      <rect x="10.5" y="10.5" width="4" height="4" className="fill-(--xp-bronze) stroke-(--xp-text)" />
      <path d="M8 1l.9 1.7 1.8.3-1.3 1.2.3 1.8" className="fill-none stroke-(--xp-gold)" />
    </Icon>
  );
}

export function BracketIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path
        d="M1.5 2.5h4v4h-4M1.5 9.5h4v4h-4M5.5 4.5h3v7h-3M8.5 8h6"
        className="fill-none stroke-(--xp-text)"
      />
      <circle cx="14" cy="8" r="1.5" className="fill-(--xp-gold)" />
    </Icon>
  );
}

export function ChartIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="1.5" y="1.5" width="13" height="13" className="fill-(--xp-cream) stroke-(--xp-text)" />
      <path d="M4 12.5v-4M7 12.5v-7M10 12.5v-3M13 12.5v-8" className="stroke-(--clt-teal) stroke-2" />
    </Icon>
  );
}

export function MediaPlayerIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="8" cy="8" r="6.5" className="fill-(--xp-title) stroke-(--xp-text)" />
      <path d="M6.5 5v6l5-3z" className="fill-(--xp-text-inverse)" />
    </Icon>
  );
}

// A folded broadsheet: masthead rule, a photo block and column lines.
export function NewspaperIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3.5 2.5h11v10.5a1.5 1.5 0 0 1-1.5 1.5H2.5A1.5 1.5 0 0 1 1 13V5.5h2.5" className="fill-(--xp-cream) stroke-(--xp-text)" />
      <path d="M3.5 2.5V13" className="stroke-(--xp-text)" />
      <path d="M5 4.5h8" className="stroke-(--xp-red) stroke-[1.5]" />
      <rect x="5" y="6.5" width="3.5" height="3" className="fill-(--clt-sky)" />
      <path d="M10 7h3M10 9h3M5 11.5h8" className="stroke-(--xp-face-shadow)" />
    </Icon>
  );
}

export function WarningIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8 1.5l6.5 12.5h-13z" className="fill-(--xp-gold) stroke-(--xp-text)" />
      <path d="M8 6v4.5M8 12v1" className="stroke-(--xp-text) stroke-[1.5]" />
    </Icon>
  );
}

export function StarIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path
        d="M8 1l2 4.5 4.8.5-3.6 3.2 1 4.8L8 11.5 3.8 14l1-4.8L1.2 6l4.8-.5z"
        className="fill-(--xp-gold) stroke-(--xp-text)"
      />
    </Icon>
  );
}

export function ProfileIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="8" cy="5" r="3" className="fill-(--clt-sky) stroke-(--clt-navy)" />
      <path d="M2.5 15c0-3.5 2.5-5.5 5.5-5.5s5.5 2 5.5 5.5z" className="fill-(--xp-select) stroke-(--clt-navy)" />
    </Icon>
  );
}

// XP's Control Panel: a window with two slider tracks.
export function ControlPanelIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="1.5" y="2.5" width="13" height="11" className="fill-(--xp-cream) stroke-(--xp-text)" />
      <path d="M1.5 4.5h13" className="stroke-(--xp-title) stroke-2" />
      <path d="M4 8h8M4 11.5h8" className="stroke-(--xp-face-shadow)" />
      <rect x="5" y="6.5" width="2" height="3" className="fill-(--xp-select)" />
      <rect x="9" y="10" width="2" height="3" className="fill-(--xp-start)" />
    </Icon>
  );
}

export function CalendarIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="1.5" y="2.5" width="13" height="12" className="fill-(--xp-cream) stroke-(--xp-text)" />
      <path d="M1.5 5.5h13" className="stroke-(--xp-red) stroke-[3]" />
      <path d="M4.5 1v3M11.5 1v3" className="stroke-(--xp-text)" />
      <path d="M4 9h2M7 9h2M10 9h2M4 12h2M7 12h2" className="stroke-(--clt-navy)" />
    </Icon>
  );
}

export function InfoIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="8" cy="8" r="6.5" className="fill-(--xp-select) stroke-(--xp-frame)" />
      <path d="M8 7v4.5M8 4.5v1" className="stroke-(--xp-text-inverse) stroke-[1.5]" />
    </Icon>
  );
}

// XP's yellow folder: the back panel with its tab, and the front flap leaning forward.
export function FolderIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M1.5 2.5h4.5l1.5 1.5h7v9.5h-13z" className="fill-(--xp-folder-back) stroke-(--xp-folder-edge)" />
      <path d="M2.5 6h12.5l-1 7.5h-13z" className="fill-(--xp-folder) stroke-(--xp-folder-edge)" />
      <path d="M3.3 7h11" className="stroke-(--xp-folder-light)" />
    </Icon>
  );
}

// Draft History: a clipboard holding the pick grid, so it never reads as a folder.
export function DraftBoardIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="2.5" y="2.5" width="11" height="12" className="fill-(--xp-wood) stroke-(--xp-text)" />
      <rect x="3.5" y="4.5" width="9" height="9" className="fill-(--xp-cream)" />
      <path d="M5.5 1.5h5v2h-5z" className="fill-(--xp-silver) stroke-(--xp-text)" />
      <path d="M4.5 5.5h2v2h-2zM9.5 8.5h2v2h-2z" className="fill-(--xp-select)" />
      <path d="M7 5.5h2v2H7zM4.5 11h2v2h-2z" className="fill-(--clt-crown)" />
      <path d="M9.5 5.5h2v2h-2zM7 8.5h2v2H7z" className="fill-(--xp-start)" />
    </Icon>
  );
}

// The League News feed: an Outlook Express inbox tray with a letter in it.
export function NewsFeedIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="3.5" y="1.5" width="9" height="7" className="fill-(--xp-cream) stroke-(--xp-text)" />
      <path d="M3.5 1.5l4.5 4 4.5-4" className="fill-none stroke-(--xp-text)" />
      <path d="M1.5 8.5h3.5l1 2h4l1-2h3.5v5h-13z" className="fill-(--xp-title-light) stroke-(--xp-frame)" />
    </Icon>
  );
}

// Waiver or free-agent move: a player in, a player out.
export function RosterMoveIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="8" cy="8" r="6.5" className="fill-(--xp-cream) stroke-(--xp-face-shadow)" />
      <path d="M5 1.5v5M2.5 4h5" className="stroke-(--xp-start-dark) stroke-2" />
      <path d="M8.5 12h5" className="stroke-(--xp-red) stroke-2" />
    </Icon>
  );
}

// Proposals: a ballot going into the box.
export function BallotIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5 1.5h6v6H5z" className="fill-(--xp-cream) stroke-(--xp-text)" />
      <path d="M6.5 4.5l1 1 2-2.5" className="fill-none stroke-(--xp-start-dark) stroke-[1.5]" />
      <path d="M1.5 7.5h13v7h-13z" className="fill-(--xp-title-light) stroke-(--xp-frame)" />
      <path d="M4 9.5h8" className="stroke-(--xp-frame) stroke-[1.5]" />
    </Icon>
  );
}

// Taxi squads: a yellow cab with its roof sign.
export function TaxiIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M6.5 2.5h3v2h-3z" className="fill-(--xp-cream) stroke-(--xp-text)" />
      <path d="M3.5 4.5h9l1.5 4h1v4h-14v-4h1z" className="fill-(--xp-gold) stroke-(--xp-text)" />
      <path d="M4.5 5.5h7l1 3h-9z" className="fill-(--xp-sky-bottom)" />
      <circle cx="4.5" cy="12.5" r="1.5" className="fill-(--xp-text)" />
      <circle cx="11.5" cy="12.5" r="1.5" className="fill-(--xp-text)" />
    </Icon>
  );
}

// Admin Members: two heads, the front one with the commissioner's gold collar.
export function MembersIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="10.5" cy="4.5" r="2.5" className="fill-(--xp-sky-bottom) stroke-(--xp-text)" />
      <path d="M6.5 12a4 4 0 0 1 8 0v1.5h-8z" className="fill-(--xp-title-light) stroke-(--xp-text)" />
      <circle cx="5.5" cy="6" r="2.5" className="fill-(--xp-cream) stroke-(--xp-text)" />
      <path d="M1.5 14.5v-1a4 4 0 0 1 8 0v1z" className="fill-(--xp-gold) stroke-(--xp-text)" />
    </Icon>
  );
}

// Admin AI Review: the report tray under a gold commissioner's shield.
export function AdminReportIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="1.5" y="3.5" width="9" height="11" className="fill-(--xp-cream) stroke-(--xp-text)" />
      <path d="M3.5 6.5h5M3.5 8.5h5M3.5 10.5h3" className="stroke-(--xp-face-shadow)" />
      <path d="M11.5 1.5l3.5 1.5v3c0 2.5-1.5 4-3.5 5-2-1-3.5-2.5-3.5-5v-3z" className="fill-(--xp-gold) stroke-(--xp-text)" />
    </Icon>
  );
}

export function TradeIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M1.5 5.5h10.5V3l3 3.5-3 3.5V7.5H1.5z" className="fill-(--xp-title-light) stroke-(--xp-frame)" strokeWidth="0.75" />
      <path d="M14.5 10.5H4V8l-3 3.5L4 15v-2.5h10.5z" className="fill-(--xp-gold) stroke-(--xp-wood)" strokeWidth="0.75" />
    </Icon>
  );
}

export function ErrorIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="8" cy="8" r="6.5" className="fill-(--xp-red) stroke-(--xp-close-dark)" />
      <path d="M5.5 5.5l5 5M10.5 5.5l-5 5" className="stroke-(--xp-text-inverse) stroke-[1.5]" />
    </Icon>
  );
}

export function SpeakerIcon({ muted, ...props }: IconProps & { muted: boolean }) {
  return (
    <Icon {...props}>
      <path d="M2 6h2.5L8 3v10l-3.5-3H2z" className="fill-(--xp-cream) stroke-(--xp-text)" />
      {muted ? (
        <path d="M10 6l4 4M14 6l-4 4" className="stroke-(--xp-red) stroke-[1.5]" />
      ) : (
        <path d="M10 6a3 3 0 0 1 0 4M11.5 4.5a5 5 0 0 1 0 7" className="fill-none stroke-(--xp-cream)" />
      )}
    </Icon>
  );
}

export function BellIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M8 1.5a1 1 0 0 1 1 1v.6a4.5 4.5 0 0 1 3.5 4.4v3l1.5 2v.5H2v-.5l1.5-2v-3A4.5 4.5 0 0 1 7 3.1v-.6a1 1 0 0 1 1-1z" className="fill-(--xp-gold) stroke-(--xp-text)" />
      <path d="M6.5 13.5a1.5 1.5 0 0 0 3 0" className="fill-(--xp-wood) stroke-(--xp-text)" />
      <path d="M5 6.5a3 3 0 0 1 1.5-2" className="fill-none stroke-(--xp-cream)" />
    </Icon>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M9.5 9.5l4.5 4.5" className="stroke-(--xp-wood) stroke-[2.5]" />
      <circle cx="6.5" cy="6.5" r="4.5" className="fill-(--xp-sky-bottom) stroke-(--xp-text) stroke-[1.5]" />
      <path d="M4.5 5a2.5 2.5 0 0 1 2-1.5" className="fill-none stroke-(--xp-cream)" />
    </Icon>
  );
}

export function FunnelIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M1.5 2.5h13l-5 5.5v5.5l-3 1v-6.5z" className="fill-none stroke-current stroke-[1.5]" strokeLinejoin="round" />
    </Icon>
  );
}

export const ALERT_ICONS = {
  info: InfoIcon,
  warning: WarningIcon,
  error: ErrorIcon,
};

export type AlertIconName = keyof typeof ALERT_ICONS;

export function MinimizeGlyph(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="4" y="10" width="6" height="2" className="fill-current" />
    </Icon>
  );
}

export function MaximizeGlyph(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3.5 3.5h9v9h-9zM3.5 5h9" className="fill-none stroke-current stroke-[1.5]" />
    </Icon>
  );
}

export function CloseGlyph(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M4 4l8 8M12 4l-8 8" className="stroke-current stroke-2" />
    </Icon>
  );
}

export function MenuIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M2 3.5h12v2H2zM2 7h12v2H2zM2 10.5h12v2H2z" className="fill-(--xp-cream) stroke-(--xp-frame) stroke-[0.5]" />
    </Icon>
  );
}

export function LinkGlyph(props: IconProps) {
  return (
    <Icon {...props}>
      <path
        d="M6.5 9.5l3-3M7.5 5l1.25-1.25a2.5 2.5 0 0 1 3.5 3.5L11 8.5M8.5 11l-1.25 1.25a2.5 2.5 0 0 1-3.5-3.5L5 7.5"
        className="fill-none stroke-current stroke-[1.5]"
      />
    </Icon>
  );
}

export function RestoreGlyph(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M5.5 3.5h7v7M3.5 5.5h7v7h-7z" className="fill-none stroke-current stroke-[1.5]" />
    </Icon>
  );
}

function NavArrow({ d, ...props }: IconProps & { d: string }) {
  return (
    <Icon {...props}>
      <circle cx="8" cy="8" r="7" className="fill-(--xp-start) stroke-(--xp-start-dark)" />
      <path d="M4 5.5a5 4 0 0 1 8 0" className="fill-none stroke-(--xp-start-light) stroke-2 opacity-70" />
      <path d={d} className="fill-(--xp-text-inverse)" />
    </Icon>
  );
}

export function BackArrowIcon(props: IconProps) {
  return <NavArrow d="M3.5 8L7.5 4.5v2h5v3h-5v2z" {...props} />;
}

export function ForwardArrowIcon(props: IconProps) {
  return <NavArrow d="M12.5 8L8.5 4.5v2h-5v3h5v2z" {...props} />;
}
