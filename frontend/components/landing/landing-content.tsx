import type { ComponentType, SVGProps } from "react";

import {
  BallotIcon,
  BracketIcon,
  CalendarIcon,
  FolderIcon,
  NewsFeedIcon,
  ScoresIcon,
  StandingsIcon,
  TaxiIcon,
  TradeIcon,
  TrophyIcon,
} from "@/components/xp/icons";

export interface Feature {
  name: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  about: string;
}

export const FEATURES: Feature[] = [
  { name: "Standings", Icon: StandingsIcon, about: "Records, points for and the BIG10, SEC and ACC division races." },
  { name: "Scores", Icon: ScoresIcon, about: "Every matchup, live on game days, with full lineups." },
  { name: "Playoffs", Icon: BracketIcon, about: "The six-team bracket, projected from the standings all season." },
  { name: "World Cup", Icon: TrophyIcon, about: "The league inside the league: divisional games only." },
  { name: "Rule Proposals", Icon: BallotIcon, about: "Pitch a rule change and vote on everyone else's." },
  { name: "Taxi Squads", Icon: TaxiIcon, about: "Every taxi squad, and steal requests with pick compensation." },
  { name: "AI Review", Icon: NewsFeedIcon, about: "Weekly league recaps, written by AI." },
  { name: "Team Analyzer", Icon: TradeIcon, about: "Roster value by position from dynasty superflex values." },
  { name: "History", Icon: CalendarIcon, about: "Champions, finishes and head-to-head records since 2024." },
  { name: "Drafts", Icon: FolderIcon, about: "Every draft board and next year's order, traded picks included." },
];

// The rulebook's format, so it renders when Sleeper doesn't answer.
export const FORMAT: [string, string][] = [
  ["Teams", "12, in three divisions"],
  ["Lineup", "QB, 2 RB, 2 WR, TE, 2 FLEX, SUPERFLEX"],
  ["Scoring", "Full PPR, 1.5 per TE catch"],
  ["Rosters", "26 active, 4 taxi, 8 IR"],
  ["Playoffs", "6 teams, weeks 15 to 17"],
  ["Rookie draft", "5 rounds, last place picks first"],
];

export function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" width={32} height={32} aria-hidden="true" focusable="false">
      <path fill="#ea4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.6 13.3l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
      <path fill="#4285f4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 7l7.4 5.7c4.3-4 6.9-9.9 6.9-17.2z" />
      <path fill="#fbbc05" d="M10.5 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C1 16.5 0 20.1 0 24s1 7.5 2.6 10.7l7.9-6.1z" />
      <path fill="#34a853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2.1 1.4-4.8 2.3-8.5 2.3-6.3 0-11.6-4.1-13.5-9.9l-7.9 6.1C6.6 42.6 14.6 48 24 48z" />
    </svg>
  );
}
