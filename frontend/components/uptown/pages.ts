import type { WindowLink } from "@/lib/desktop/deep-link";
import { type GroupId, isGroup } from "@/lib/desktop/groups";
import { isKind, REGISTRY, type WindowKind } from "@/lib/desktop/registry";
import { windowId } from "@/lib/desktop/windows";

// One line per launchable window, under its name in a group's page and in Spotlight.
export const ABOUT: Partial<Record<WindowKind, string>> = {
  home: "This week at a glance: your team, the matchups, the standings.",
  standings: "Records, points for and the division races.",
  scores: "Every matchup, live on game days, with full lineups.",
  playoffs: "The six-team bracket, projected all season.",
  "world-cup": "The league inside the league: divisional games only.",
  rules: "The rulebook, scoring, league settings and payouts.",
  history: "Champions, season finishes and head-to-head records.",
  "matchup-history": "Every past week's matchups, with full lineups.",
  drafts: "Every draft board, pick by pick.",
  "draft-order": "Next year's order, traded picks included.",
  taxi: "Every taxi squad, and steal requests.",
  "my-team": "Your roster, record and schedule.",
  profile: "Your Sleeper profile and leagues.",
  analyzer: "Roster value by position, against the league.",
  settings: "Your account, your Sleeper link and league settings.",
  proposals: "Pitch a rule change and vote on the rest.",
  "ai-review": "Weekly league recaps, written by AI.",
  search: "Look up any Sleeper user or league.",
  members: "Who is on the roster, and their Sleeper links.",
  "admin-ai": "Write, review and publish the AI recaps.",
  "admin-announcements": "Post and retire announcements on Home.",
};

export const HOME: WindowLink = { kind: "home", params: {} };

export const urlOf = (view: WindowLink) => (view.kind === "home" ? "/" : `/?open=${windowId(view.kind, view.params)}`);

// The group a view files under. Drill-only pages (a team, a league, a report)
// have none, so they stay under the group they were opened from.
export function groupOf(view: WindowLink, from: GroupId | null): GroupId | null {
  if (view.kind === "home") return null;
  if (view.kind === "folder") return isGroup(String(view.params.id)) ? (view.params.id as GroupId) : from;
  const kind: string = view.kind;
  return isKind(kind) ? (REGISTRY[kind].group ?? from) : from;
}
