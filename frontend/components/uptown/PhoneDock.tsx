"use client";

import type { WindowLink } from "@/lib/desktop/deep-link";
import { useLaunchers } from "@/lib/desktop/registry";
import { LINE, LineIcon } from "./icons";
import { useInk } from "./use-ink";

const TABS = [
  { kind: "home", label: "Home", d: LINE.home },
  { kind: "scores", label: "Scores", d: LINE.scores },
  { kind: "standings", label: "Standings", d: LINE.standings },
  { kind: "playoffs", label: "Playoffs", d: LINE.bracket },
  { kind: "my-team", label: "My Team", d: LINE.star },
] as const;

interface PhoneDockProps {
  // The page on top of the stack; Home when there is none.
  current: string;
  onGo: (to: WindowLink) => void;
}

// The phone's tab bar: the pages people open every week, a thumb away.
export function PhoneDock({ current, onGo }: PhoneDockProps) {
  const nav = useInk(current);
  const launchers = useLaunchers();
  const tabs = TABS.filter((t) => launchers.some((l) => l.kind === t.kind));
  return (
    <nav ref={nav} aria-label="Quick" className="up-dock u-inked">
      <i className="u-ink" aria-hidden />
      {tabs.map((t) => (
        <button
          key={t.kind}
          type="button"
          className="up-dock-tab"
          aria-current={t.kind === current ? "page" : undefined}
          onClick={() => onGo({ kind: t.kind, params: {} })}
        >
          <LineIcon d={t.d} size={22} />
          <span>{t.label}</span>
        </button>
      ))}
    </nav>
  );
}
