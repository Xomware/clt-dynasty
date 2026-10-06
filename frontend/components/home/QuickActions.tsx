"use client";

import { useContext } from "react";

import { BallotIcon, RosterMoveIcon, TaxiIcon } from "@/components/xp/icons";
import { LEAGUE_ID } from "@/lib/config";
import { DrillContext, NavigateContext } from "@/lib/desktop/navigation";

// Sleeper owns lineups, so setting one is a link out to the league there.
export const SLEEPER_TEAM_URL = `https://sleeper.com/leagues/${LEAGUE_ID}/team`;

// The three things members come to do each week, one tap from Home.
export function QuickActions({ className = "" }: { className?: string }) {
  const drill = useContext(DrillContext);
  const navigate = useContext(NavigateContext);
  const go = (kind: "proposals" | "taxi") => (navigate ?? drill)({ kind, params: {} });
  return (
    <ul className={`home-actions ${className}`} aria-label="Quick actions">
      <li>
        <a className="xp-button home-action" href={SLEEPER_TEAM_URL} target="_blank" rel="noreferrer">
          <RosterMoveIcon width={20} height={20} className="flex-none" aria-hidden />
          Set your lineup in Sleeper
          <span className="sr-only"> (opens Sleeper)</span>
        </a>
      </li>
      <li>
        <button type="button" className="xp-button home-action" onClick={() => go("proposals")}>
          <BallotIcon width={20} height={20} className="flex-none" aria-hidden />
          Propose a rule
        </button>
      </li>
      <li>
        <button type="button" className="xp-button home-action" onClick={() => go("taxi")}>
          <TaxiIcon width={20} height={20} className="flex-none" aria-hidden />
          Steal a taxi player
        </button>
      </li>
    </ul>
  );
}
