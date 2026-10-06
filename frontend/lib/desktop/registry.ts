import { type ComponentType, type SVGProps, useSyncExternalStore } from "react";

import { AdminAIWindow } from "@/components/windows/AdminAIWindow";
import { AdminAnnouncementsWindow } from "@/components/windows/AdminAnnouncementsWindow";
import { AIReportWindow, AIReviewWindow, readReportLink, reportTitle } from "@/components/windows/AIReviewWindow";
import { AnalyzerWindow } from "@/components/windows/AnalyzerWindow";
import { DraftHistoryWindow } from "@/components/windows/DraftHistoryWindow";
import { DraftOrderWindow } from "@/components/windows/DraftOrderWindow";
import { FolderWindow } from "@/components/windows/FolderWindow";
import { HistoryWindow } from "@/components/windows/HistoryWindow";
import { HomeWindow } from "@/components/windows/HomeWindow";
import { LeagueWindow } from "@/components/windows/LeagueWindow";
import { MatchupHistoryWindow } from "@/components/windows/MatchupHistoryWindow";
import { MembersWindow } from "@/components/windows/MembersWindow";
import { PlayerWindow, playerTitle, readPlayerLink } from "@/components/windows/PlayerWindow";
import { PlayoffsWindow } from "@/components/windows/PlayoffsWindow";
import { ProfileWindow } from "@/components/windows/ProfileWindow";
import { ProposalsWindow } from "@/components/windows/ProposalsWindow";
import { RulesWindow } from "@/components/windows/RulesWindow";
import { ScoresWindow } from "@/components/windows/ScoresWindow";
import { SearchWindow } from "@/components/windows/SearchWindow";
import { SettingsWindow } from "@/components/windows/SettingsWindow";
import { StandingsWindow } from "@/components/windows/StandingsWindow";
import { TaxiWindow } from "@/components/windows/TaxiWindow";
import { MyTeamWindow, TeamWindow } from "@/components/windows/TeamWindow";
import { WorldCupWindow } from "@/components/windows/WorldCupWindow";
import {
  AdminReportIcon,
  BallotIcon,
  BellIcon,
  BracketIcon,
  CalendarIcon,
  ChartIcon,
  ControlPanelIcon,
  DraftBoardIcon,
  FolderIcon,
  HomeIcon,
  JerseyIcon,
  MembersIcon,
  NewsFeedIcon,
  NewspaperIcon,
  ProfileIcon,
  RosterMoveIcon,
  ScoresIcon,
  SearchIcon,
  StandingsIcon,
  StarIcon,
  TaxiIcon,
  TradeIcon,
  TrophyIcon,
} from "@/components/xp/icons";
import { LEAGUE_ID } from "@/lib/config";
import { settled, settledVersion, subscribeSettled } from "@/lib/league/cache";
import { teamOf } from "@/lib/league/use-league";
import type { SleeperAccount, SleeperLeague, SleeperPlayer, SleeperRoster, SleeperUser } from "@/lib/sleeper/types";
import { readIdLink, readTeamLink } from "@/lib/team/links";

import { useMember } from "@/lib/member/use-member";

import { GROUPS, type GroupId, groupLabel, isGroup } from "./groups";
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
  // Offered only when /clt/me says isAdmin. The window still checks, for links and saved layouts.
  adminOnly?: boolean;
  // Where the launchers file it; none keeps it at the top level, like Home.
  group?: GroupId;
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
  home: { label: "Home", title: "CLT Dynasty League", Icon: HomeIcon, component: HomeWindow, defaultSize: { w: 760, h: 700 } },
  standings: { group: "league", label: "Standings", title: "League Standings", Icon: StandingsIcon, component: StandingsWindow, defaultSize: { w: 640, h: 560 } },
  scores: { group: "league", label: "Scores", title: "Scores", Icon: ScoresIcon, component: ScoresWindow, defaultSize: { w: 560, h: 600 } },
  playoffs: { group: "league", label: "Playoffs", title: "Playoffs", Icon: BracketIcon, component: PlayoffsWindow, defaultSize: { w: 900, h: 620 } },
  history: { group: "history", label: "History", title: "League History", Icon: CalendarIcon, component: HistoryWindow, defaultSize: { w: 640, h: 600 } },
  "matchup-history": {
    group: "history",
    label: "Matchup History",
    title: "Matchup History",
    Icon: ChartIcon,
    component: MatchupHistoryWindow,
    defaultSize: { w: 560, h: 620 },
  },
  drafts: { group: "draft", label: "Draft History", title: "Draft History", Icon: DraftBoardIcon, component: DraftHistoryWindow, defaultSize: { w: 640, h: 620 } },
  "draft-order": {
    group: "draft",
    label: "Draft Order",
    title: "Draft Order",
    Icon: RosterMoveIcon,
    component: DraftOrderWindow,
    defaultSize: { w: 600, h: 620 },
  },
  "world-cup": { group: "league", label: "World Cup", title: "World Cup", Icon: TrophyIcon, component: WorldCupWindow, defaultSize: { w: 640, h: 640 } },
  proposals: { group: "community", label: "Proposals", title: "Rule Proposals", Icon: BallotIcon, component: ProposalsWindow, defaultSize: { w: 600, h: 640 } },
  taxi: { group: "draft", label: "Taxi Squads", title: "Taxi Squads", Icon: TaxiIcon, component: TaxiWindow, defaultSize: { w: 600, h: 640 } },
  "ai-review": { group: "community", label: "AI Review", title: "AI Review", Icon: NewsFeedIcon, component: AIReviewWindow, defaultSize: { w: 640, h: 640 } },
  "ai-report": {
    label: "AI Report",
    title: reportTitle,
    Icon: NewsFeedIcon,
    component: AIReportWindow,
    defaultSize: { w: 680, h: 680 },
    link: readReportLink,
    drillOnly: true,
  },
  rules: { group: "league", label: "Rules", title: "League Rules", Icon: NewspaperIcon, component: RulesWindow, defaultSize: { w: 600, h: 600 } },
  "my-team": { group: "mine", label: "My Team", title: "My Team", Icon: StarIcon, component: MyTeamWindow, defaultSize: { w: 640, h: 640 } },
  profile: {
    group: "mine",
    label: "Profile",
    title: profileTitle,
    Icon: ProfileIcon,
    component: ProfileWindow,
    defaultSize: { w: 520, h: 560 },
    link: readIdLink("userId"),
  },
  analyzer: { group: "mine", label: "Team Analyzer", title: "Team Analyzer", Icon: TradeIcon, component: AnalyzerWindow, defaultSize: { w: 760, h: 620 } },
  settings: { group: "mine", label: "Settings", title: "Settings", Icon: ControlPanelIcon, component: SettingsWindow, defaultSize: { w: 520, h: 520 } },
  search: {
    group: "community",
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
  player: {
    label: "Player",
    title: (p) => playerTitle(settled<SleeperPlayer | null>(`player/${p.playerId}`)),
    Icon: JerseyIcon,
    component: PlayerWindow,
    defaultSize: { w: 640, h: 680 },
    link: readPlayerLink,
    drillOnly: true,
  },
  folder: {
    label: "Folder",
    title: (p) => groupLabel(p.id),
    Icon: FolderIcon,
    component: FolderWindow,
    defaultSize: { w: 600, h: 420 },
    link: (v) => (isGroup(v) ? { id: v } : null),
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
  members: {
    group: "admin",
    label: "Members",
    title: "Admin: Members",
    Icon: MembersIcon,
    component: MembersWindow,
    defaultSize: { w: 600, h: 620 },
    adminOnly: true,
  },
  "admin-ai": {
    group: "admin",
    label: "Admin AI",
    title: "Admin: AI Review",
    Icon: AdminReportIcon,
    component: AdminAIWindow,
    defaultSize: { w: 640, h: 660 },
    adminOnly: true,
  },
  "admin-announcements": {
    group: "admin",
    label: "Announcements",
    title: "Admin: Announcements",
    Icon: BellIcon,
    component: AdminAnnouncementsWindow,
    defaultSize: { w: 600, h: 640 },
    adminOnly: true,
  },
} satisfies Record<string, WindowSpec>;

export type WindowKind = keyof typeof SPECS;
export const REGISTRY: Record<string, WindowSpec> = SPECS;

export const isKind = (kind: string): kind is WindowKind => Object.hasOwn(REGISTRY, kind);

// What the desktop, Start and the phone list offer.
export function useLaunchers() {
  const { state } = useMember();
  const isAdmin = state.status === "member" && state.me.isAdmin;
  return Object.entries(REGISTRY)
    .filter(([, spec]) => !spec.drillOnly && (!spec.adminOnly || isAdmin))
    .map(([kind, spec]) => ({ kind: kind as WindowKind, ...spec }));
}

export type Launcher = ReturnType<typeof useLaunchers>[number];

// The launchers filed for the shell: ungrouped ones first, then each group
// that has anything to show this member, in GROUPS order.
export function useLauncherGroups() {
  const launchers = useLaunchers();
  return {
    pinned: launchers.filter((l) => !l.group),
    groups: GROUPS.map((g) => ({ ...g, items: launchers.filter((l) => l.group === g.id) })).filter((g) => g.items.length > 0),
  };
}

export function windowTitle({ kind, params }: WindowView): string {
  const { title } = REGISTRY[kind];
  return typeof title === "string" ? title : title(params);
}

// Re-renders the caller when Sleeper data lands, so a title that names a team or league catches up.
export function useWindowTitle(): (view: WindowView) => string {
  useSyncExternalStore(subscribeSettled, settledVersion, settledVersion);
  return windowTitle;
}
