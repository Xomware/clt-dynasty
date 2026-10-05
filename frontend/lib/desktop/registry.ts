import { type ComponentType, type SVGProps, useSyncExternalStore } from "react";

import { AnalyzerWindow } from "@/components/windows/AnalyzerWindow";
import { DraftHistoryWindow } from "@/components/windows/DraftHistoryWindow";
import { DraftOrderWindow } from "@/components/windows/DraftOrderWindow";
import { HistoryWindow } from "@/components/windows/HistoryWindow";
import { HomeWindow } from "@/components/windows/HomeWindow";
import { LeagueWindow } from "@/components/windows/LeagueWindow";
import { MatchupHistoryWindow } from "@/components/windows/MatchupHistoryWindow";
import { PlayoffsWindow } from "@/components/windows/PlayoffsWindow";
import { ProfileWindow } from "@/components/windows/ProfileWindow";
import { RulesWindow } from "@/components/windows/RulesWindow";
import { ScoresWindow } from "@/components/windows/ScoresWindow";
import { SearchWindow } from "@/components/windows/SearchWindow";
import { SettingsWindow } from "@/components/windows/SettingsWindow";
import { StandingsWindow } from "@/components/windows/StandingsWindow";
import { MyTeamWindow, TeamWindow } from "@/components/windows/TeamWindow";
import {
  BracketIcon,
  CalendarIcon,
  ChartIcon,
  ControlPanelIcon,
  FolderIcon,
  HomeIcon,
  NewspaperIcon,
  ProfileIcon,
  RosterMoveIcon,
  ScoresIcon,
  SearchIcon,
  StandingsIcon,
  StarIcon,
  TradeIcon,
  TrophyIcon,
} from "@/components/xp/icons";
import { LEAGUE_ID } from "@/lib/config";
import { settled, settledVersion, subscribeSettled } from "@/lib/league/cache";
import { teamOf } from "@/lib/league/use-league";
import type { SleeperAccount, SleeperLeague, SleeperRoster, SleeperUser } from "@/lib/sleeper/types";
import { readIdLink, readTeamLink } from "@/lib/team/links";

import type { WindowParams, WindowView } from "./windows";

export interface WindowSpec {
  // Short name on the desktop icon, the Start menu and the phone's program list.
  label: string;
  title: string | ((params: WindowParams) => string);
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  component: ComponentType<{ params: WindowParams }>;
  defaultSize: { w: number; h: number };
  // Reads a `?open=kind:value` link's value back into params. Without it the
  // kind takes no value.
  link?: (value: string) => WindowParams | null;
  // Opened only by a drill from another window (a team, a player), never
  // from the desktop, Start or the phone's list.
  drillOnly?: boolean;
}

// Titles name what the window shows once Sleeper has answered for it.
function teamTitle(p: WindowParams): string {
  const leagueId = String(p.leagueId ?? LEAGUE_ID);
  const rosterId = Number(p.rosterId);
  const users = settled<SleeperUser[]>(`users/${leagueId}`);
  const rosters = settled<SleeperRoster[]>(`rosters/${leagueId}`);
  if (!users || !rosters) return "Team Profile";
  return `Team Profile - ${teamOf(users, rosters.find((r) => r.roster_id === rosterId), rosterId).name}`;
}

function profileTitle(p: WindowParams): string {
  if (!p.userId) return "My Profile";
  const name = settled<SleeperAccount | null>(`account/${p.userId}`)?.display_name;
  return name ? `Profile - ${name}` : "Profile";
}

// One entry per window kind, in launcher order. Each league window adds itself here.
const SPECS = {
  home: { label: "Home", title: "CLT Dynasty League", Icon: HomeIcon, component: HomeWindow, defaultSize: { w: 640, h: 640 } },
  standings: { label: "Standings", title: "League Standings", Icon: StandingsIcon, component: StandingsWindow, defaultSize: { w: 640, h: 560 } },
  scores: { label: "Scores", title: "Scores", Icon: ScoresIcon, component: ScoresWindow, defaultSize: { w: 560, h: 600 } },
  playoffs: { label: "Playoffs", title: "Playoffs", Icon: BracketIcon, component: PlayoffsWindow, defaultSize: { w: 720, h: 560 } },
  history: { label: "History", title: "League History", Icon: CalendarIcon, component: HistoryWindow, defaultSize: { w: 640, h: 600 } },
  "matchup-history": {
    label: "Matchup History",
    title: "Matchup History",
    Icon: ChartIcon,
    component: MatchupHistoryWindow,
    defaultSize: { w: 560, h: 620 },
  },
  drafts: { label: "Draft History", title: "Draft History", Icon: FolderIcon, component: DraftHistoryWindow, defaultSize: { w: 640, h: 620 } },
  "draft-order": {
    label: "Draft Order",
    title: "Draft Order",
    Icon: RosterMoveIcon,
    component: DraftOrderWindow,
    defaultSize: { w: 600, h: 620 },
  },
  rules: { label: "Rules", title: "League Rules", Icon: NewspaperIcon, component: RulesWindow, defaultSize: { w: 600, h: 600 } },
  settings: { label: "Settings", title: "Settings", Icon: ControlPanelIcon, component: SettingsWindow, defaultSize: { w: 520, h: 520 } },
  "my-team": { label: "My Team", title: "My Team", Icon: StarIcon, component: MyTeamWindow, defaultSize: { w: 640, h: 640 } },
  profile: {
    label: "Profile",
    title: profileTitle,
    Icon: ProfileIcon,
    component: ProfileWindow,
    defaultSize: { w: 520, h: 560 },
    link: readIdLink("userId"),
  },
  analyzer: { label: "Team Analyzer", title: "Team Analyzer", Icon: TradeIcon, component: AnalyzerWindow, defaultSize: { w: 760, h: 620 } },
  search: {
    label: "Search",
    title: "Search Sleeper",
    Icon: SearchIcon,
    component: SearchWindow,
    defaultSize: { w: 460, h: 360 },
    // `search:user:<name>` or `search:league:<id>`, the search Back returns to.
    link: (v) => {
      const [mode, ...q] = v.split(":");
      return mode === "user" || mode === "league" ? { mode, q: q.join(":") } : null;
    },
  },
  team: {
    label: "Team",
    title: teamTitle,
    Icon: ProfileIcon,
    component: TeamWindow,
    defaultSize: { w: 640, h: 640 },
    link: readTeamLink,
    drillOnly: true,
  },
  league: {
    label: "League",
    title: (p) => settled<SleeperLeague>(`league/${p.leagueId}`)?.name ?? "League",
    Icon: TrophyIcon,
    component: LeagueWindow,
    defaultSize: { w: 600, h: 600 },
    link: readIdLink("leagueId"),
    drillOnly: true,
  },
} satisfies Record<string, WindowSpec>;

export type WindowKind = keyof typeof SPECS;
export const REGISTRY: Record<string, WindowSpec> = SPECS;

export const isKind = (kind: string): kind is WindowKind => Object.hasOwn(REGISTRY, kind);

// What the desktop, Start and the phone list offer.
export const launchers = () =>
  Object.entries(REGISTRY)
    .filter(([, spec]) => !spec.drillOnly)
    .map(([kind, spec]) => ({ kind: kind as WindowKind, ...spec }));

export function windowTitle({ kind, params }: WindowView): string {
  const { title } = REGISTRY[kind];
  return typeof title === "string" ? title : title(params);
}

// Re-renders the caller when Sleeper data lands, so a title that names a team or league catches up.
export function useWindowTitle(): (view: WindowView) => string {
  useSyncExternalStore(subscribeSettled, settledVersion, settledVersion);
  return windowTitle;
}
