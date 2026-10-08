"use client";

import { RosterMoveIcon } from "@/components/xp/icons";
import { LEAGUE_ID } from "@/lib/config";

// Sleeper owns lineups, so setting one is a link out to the league there.
export const SLEEPER_TEAM_URL = `https://sleeper.com/leagues/${LEAGUE_ID}/team`;

export function QuickActions({ className = "" }: { className?: string }) {
  return (
    <ul className={`home-actions ${className}`} aria-label="Quick actions">
      <li>
        <a className="xp-button home-action" href={SLEEPER_TEAM_URL} target="_blank" rel="noreferrer">
          <RosterMoveIcon width={20} height={20} className="flex-none" aria-hidden />
          Set your lineup in Sleeper
          <span className="sr-only"> (opens Sleeper)</span>
        </a>
      </li>
    </ul>
  );
}
