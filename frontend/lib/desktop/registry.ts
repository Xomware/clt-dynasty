import { type ComponentType, type SVGProps, useSyncExternalStore } from "react";

import { AnalyzerWindow } from "@/components/windows/AnalyzerWindow";
import { HomeWindow } from "@/components/windows/HomeWindow";
import { LeagueWindow } from "@/components/windows/LeagueWindow";
import { ProfileWindow } from "@/components/windows/ProfileWindow";
import { ScoresWindow } from "@/components/windows/ScoresWindow";
import { SearchWindow } from "@/components/windows/SearchWindow";
import { SettingsWindow } from "@/components/windows/SettingsWindow";
import { StandingsWindow } from "@/components/windows/StandingsWindow";
import { MyTeamWindow, TeamWindow } from "@/components/windows/TeamWindow";
import { ChartIcon, ControlPanelIcon, HomeIcon, ProfileIcon, ScoresIcon, SearchIcon, StandingsIcon, StarIcon, TrophyIcon } from "@/components/xp/icons";
import { LEAGUE_ID } from "@/lib/config";
import { loadedAccount, loadedLeague, loadedRosters, loadedUsers, loadedVersion, subscribeLoaded } from "@/lib/sleeper/league";
import { readIdLink, readTeamLink } from "@/lib/team/links";
import { teamName } from "@/lib/team/team";

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
  const [users, rosters] = [loadedUsers(leagueId), loadedRosters(leagueId)];
  if (!users || !rosters) return "Team Profile";
  return `Team Profile - ${teamName(rosters.find((r) => r.roster_id === rosterId), users, rosterId)}`;
}

function profileTitle(p: WindowParams): string {
  if (!p.userId) return "My Profile";
  const name = loadedAccount(String(p.userId))?.display_name;
  return name ? `Profile - ${name}` : "Profile";
}

// One entry per window kind, in launcher order. Each league window adds itself here.
const SPECS = {
  home: { label: "Home", title: "CLT Dynasty League", Icon: HomeIcon, component: HomeWindow, defaultSize: { w: 640, h: 640 } },
  standings: { label: "Standings", title: "League Standings", Icon: StandingsIcon, component: StandingsWindow, defaultSize: { w: 640, h: 560 } },
  scores: { label: "Scores", title: "Scores", Icon: ScoresIcon, component: ScoresWindow, defaultSize: { w: 560, h: 600 } },
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
  analyzer: { label: "Team Analyzer", title: "Team Analyzer", Icon: ChartIcon, component: AnalyzerWindow, defaultSize: { w: 760, h: 620 } },
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
    title: (p) => loadedLeague(String(p.leagueId))?.name ?? "League",
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
  useSyncExternalStore(subscribeLoaded, loadedVersion, loadedVersion);
  return windowTitle;
}
