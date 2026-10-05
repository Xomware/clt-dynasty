import type { ComponentType, SVGProps } from "react";

import { DraftHistoryWindow } from "@/components/windows/DraftHistoryWindow";
import { DraftOrderWindow } from "@/components/windows/DraftOrderWindow";
import { HistoryWindow } from "@/components/windows/HistoryWindow";
import { MatchupHistoryWindow } from "@/components/windows/MatchupHistoryWindow";
import { PlayoffsWindow } from "@/components/windows/PlayoffsWindow";
import { ProposalsWindow } from "@/components/windows/ProposalsWindow";
import { RulesWindow } from "@/components/windows/RulesWindow";
import { ScoresWindow } from "@/components/windows/ScoresWindow";
import { SettingsWindow } from "@/components/windows/SettingsWindow";
import { StandingsWindow } from "@/components/windows/StandingsWindow";
import { TaxiWindow } from "@/components/windows/TaxiWindow";
import { WorldCupWindow } from "@/components/windows/WorldCupWindow";
import {
  BallotIcon,
  BracketIcon,
  CalendarIcon,
  ChartIcon,
  ControlPanelIcon,
  FolderIcon,
  NewspaperIcon,
  RosterMoveIcon,
  ScoresIcon,
  StandingsIcon,
  TaxiIcon,
  TrophyIcon,
} from "@/components/xp/icons";

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

// One entry per window kind, in launcher order. Each league window adds itself here.
const SPECS = {
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
  "world-cup": { label: "World Cup", title: "World Cup", Icon: TrophyIcon, component: WorldCupWindow, defaultSize: { w: 640, h: 640 } },
  proposals: { label: "Proposals", title: "Rule Proposals", Icon: BallotIcon, component: ProposalsWindow, defaultSize: { w: 600, h: 640 } },
  taxi: { label: "Taxi Squads", title: "Taxi Squads", Icon: TaxiIcon, component: TaxiWindow, defaultSize: { w: 600, h: 640 } },
  rules: { label: "Rules", title: "League Rules", Icon: NewspaperIcon, component: RulesWindow, defaultSize: { w: 600, h: 600 } },
  settings: { label: "Settings", title: "Settings", Icon: ControlPanelIcon, component: SettingsWindow, defaultSize: { w: 520, h: 520 } },
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
