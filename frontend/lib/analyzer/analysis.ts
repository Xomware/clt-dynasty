import type { Player } from "@/lib/api/players";
import { teamOf } from "@/lib/league/use-league";
import type { SleeperRoster, SleeperUser } from "@/lib/sleeper/types";
import { valueOf, type Values } from "./values";

export const AXES = ["QB", "RB", "WR", "TE", "Bench", "Taxi"] as const;
export type Axis = (typeof AXES)[number];
export type AxisValues = Record<Axis, number>;

export interface TeamAnalysis {
  rosterId: number;
  name: string;
  avatarUrl: string | null;
  ownerId: string | null;
  axes: AxisValues;
  total: number;
}

const STARTER_AXES = new Set<string>(["QB", "RB", "WR", "TE"]);
const zero = (): AxisValues => ({ QB: 0, RB: 0, WR: 0, TE: 0, Bench: 0, Taxi: 0 });

// Ported from the Angular app's TeamAnalysisService, itself a port of iOS
// TeamAnalysisBuilder, so the numbers match what members saw there:
// - taxi players count only toward Taxi;
// - IR players count toward nothing;
// - a starter counts toward his position, and a starting K or DEF toward Bench;
// - everyone else is Bench.
export function analyze(roster: SleeperRoster, users: SleeperUser[], players: Record<string, Player>, values: Values): TeamAnalysis {
  const starters = new Set(roster.starters ?? []);
  const taxi = new Set(roster.taxi ?? []);
  const reserve = new Set(roster.reserve ?? []);
  const axes = zero();

  for (const id of roster.players ?? []) {
    const value = valueOf(values, id);
    if (value <= 0 || reserve.has(id)) continue;
    if (taxi.has(id)) {
      axes.Taxi += value;
      continue;
    }
    const position = (players[id]?.position ?? values.players.get(id)?.position ?? "").toUpperCase();
    const axis = starters.has(id) && STARTER_AXES.has(position) ? (position as Axis) : "Bench";
    axes[axis] += value;
  }

  return {
    rosterId: roster.roster_id,
    ...teamOf(users, roster, roster.roster_id),
    ownerId: roster.owner_id,
    axes,
    total: AXES.reduce((sum, a) => sum + axes[a], 0),
  };
}

export function leagueShape(teams: TeamAnalysis[]) {
  const max = zero();
  const average = zero();
  for (const t of teams) {
    for (const a of AXES) {
      max[a] = Math.max(max[a], t.axes[a]);
      average[a] += t.axes[a] / teams.length;
    }
  }
  for (const a of AXES) average[a] = Math.round(average[a]);
  const averageTotal = teams.length ? Math.round(teams.reduce((s, t) => s + t.total, 0) / teams.length) : 0;
  return { max, average, averageTotal };
}

export type Standing = "above" | "below" | "even";

// Five percent over the league average reads as a strength, fifteen under as a hole.
export function standing(value: number, average: number): Standing {
  if (average <= 0) return "even";
  const ratio = value / average;
  return ratio >= 1.05 ? "above" : ratio <= 0.85 ? "below" : "even";
}
