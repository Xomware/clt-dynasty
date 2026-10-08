import { bestLineup } from "@/lib/home/lineup";
import type { PlayerWeek } from "@/lib/home/projections";
import type { SleeperLeague, SleeperRoster } from "@/lib/sleeper/types";
import { type Fields, list } from "./params";
import { lineupBase, lineupPoints, round1 } from "./worth";

export interface Scenario {
  adds: string[];
  drops: string[];
  // My players moved to injured reserve, which frees an active spot.
  ir: string[];
}

export const EMPTY_SCENARIO: Scenario = { adds: [], drops: [], ir: [] };

const IDS = /^\d+$/;
const ids = (s: string | undefined) => [...new Set(list(s).filter((id) => IDS.test(id)))];

export const readScenario = (fields: Fields): Scenario => ({ adds: ids(fields.get("add")), drops: ids(fields.get("drop")), ir: ids(fields.get("ir")) });

export function writeScenario(s: Scenario, fields: Fields = new Map()): Fields {
  const out = new Map(fields);
  const set = (k: string, v: string[]) => (v.length ? out.set(k, v.join(".")) : out.delete(k));
  set("add", s.adds);
  set("drop", s.drops);
  set("ir", s.ir);
  return out;
}

export const isEmpty = (s: Scenario) => s.adds.length + s.drops.length + s.ir.length === 0;

export interface Limits {
  active: number;
  taxi: number;
  ir: number;
  // The injury designations the league lets onto IR.
  irStatuses: string[];
}

// The active roster is every slot but IR and taxi; Sleeper's settings say
// how many of each and which designations IR takes. IR itself always does.
export function limitsOf(league: SleeperLeague): Limits {
  const s = league.settings as Record<string, unknown>;
  const allow = (key: string) => Number(s[key] ?? 0) > 0;
  const statuses: [string, string][] = [
    ["Out", "reserve_allow_out"],
    ["Doubtful", "reserve_allow_doubtful"],
    ["Sus", "reserve_allow_sus"],
    ["NA", "reserve_allow_na"],
    ["DNR", "reserve_allow_dnr"],
    ["COV", "reserve_allow_cov"],
  ];
  return {
    active: league.roster_positions.filter((p) => p !== "IR" && p !== "TAXI").length,
    taxi: Number(s.taxi_slots ?? 0),
    ir: Number(s.reserve_slots ?? 0),
    irStatuses: ["IR", ...statuses.filter(([, k]) => allow(k)).map(([status]) => status)],
  };
}

export interface Counts {
  active: number;
  taxi: number;
  ir: number;
}

export interface Side {
  rosterId: number;
  roster: SleeperRoster;
  // Best legal lineup this week, by slot.
  before: (string | null)[];
  after: (string | null)[];
  beforePoints: number;
  afterPoints: number;
  // Slot indexes whose player changes.
  changed: number[];
  valueBefore: number;
  valueAfter: number;
  counts: Counts;
}

export interface Depth {
  position: string;
  before: { count: number; value: number };
  after: { count: number; value: number };
  league: { count: number; value: number };
}

export type Problem =
  | { kind: "rostered" | "not-mine" | "locked" | "not-ir-eligible"; id: string }
  | { kind: "over"; spot: keyof Counts; by: number };

export interface Simulation {
  mine: Side;
  depth: Depth[];
  problems: Problem[];
}

// Runs a scenario against my team; null until the league and rosters load.
export type SimFor = ((scenario: Scenario) => Simulation | null) | null;

export interface SimInput {
  scenario: Scenario;
  rosterId: number;
  rosters: SleeperRoster[];
  slots: string[];
  limits: Limits;
  week: (id: string) => PlayerWeek;
  value: (id: string) => number;
  injury: (id: string) => string | null;
}

export const DEPTH_POSITIONS = ["QB", "RB", "WR", "TE"];

const countsOf = (r: SleeperRoster): Counts => {
  const taxi = r.taxi?.length ?? 0;
  const ir = r.reserve?.length ?? 0;
  return { active: (r.players?.length ?? 0) - taxi - ir, taxi, ir };
};

// The roster after the moves: `out` leave from wherever they are, `into`
// join the active roster, `toIr` move from active to IR.
export function moveRoster(r: SleeperRoster, out: string[], into: string[], toIr: string[] = []): SleeperRoster {
  const gone = new Set(out);
  const keep = (ids: string[] | null | undefined) => (ids ?? []).filter((id) => !gone.has(id));
  return {
    ...r,
    players: [...keep(r.players), ...into],
    starters: (r.starters ?? []).map((id) => (gone.has(id) || toIr.includes(id) ? "0" : id)),
    taxi: keep(r.taxi),
    reserve: [...keep(r.reserve), ...toIr.filter((id) => !gone.has(id))],
  };
}

export function sideOf(roster: SleeperRoster, after: SleeperRoster, slots: string[], week: (id: string) => PlayerWeek, value: (id: string) => number): Side {
  const lineup = (r: SleeperRoster) => {
    const { fixed, pool } = lineupBase({ slots, roster: r, week });
    const starting = new Set(r.starters ?? []);
    return bestLineup(slots, fixed, pool, week, (id) => starting.has(id));
  };
  const total = (r: SleeperRoster) => (r.players ?? []).reduce((sum, id) => sum + value(id), 0);
  const before = lineup(roster);
  const next = lineup(after);
  return {
    rosterId: roster.roster_id,
    roster: after,
    before,
    after: next,
    beforePoints: lineupPoints(before, week),
    afterPoints: lineupPoints(next, week),
    changed: slots.flatMap((_, i) => (before[i] !== next[i] ? [i] : [])),
    valueBefore: total(roster),
    valueAfter: total(after),
    counts: countsOf(after),
  };
}

export function overLimits(c: Counts, limits: Limits): Problem[] {
  return (["active", "taxi", "ir"] as const).flatMap((spot) => (c[spot] > limits[spot] ? [{ kind: "over" as const, spot, by: c[spot] - limits[spot] }] : []));
}

// Depth at a position counts the players who can play for the team this
// season: active and taxi, not IR.
function depthAt(r: SleeperRoster, position: string, week: (id: string) => PlayerWeek, value: (id: string) => number) {
  const ir = new Set(r.reserve ?? []);
  const at = (r.players ?? []).filter((id) => !ir.has(id) && week(id).position === position);
  return { count: at.length, value: at.reduce((sum, id) => sum + value(id), 0) };
}

export function depthTable(before: SleeperRoster, after: SleeperRoster, rosters: SleeperRoster[], week: (id: string) => PlayerWeek, value: (id: string) => number): Depth[] {
  return DEPTH_POSITIONS.map((position) => {
    const all = rosters.map((r) => depthAt(r, position, week, value));
    const n = Math.max(1, all.length);
    return {
      position,
      before: depthAt(before, position, week, value),
      after: depthAt(after, position, week, value),
      league: { count: round1(all.reduce((s, d) => s + d.count, 0) / n), value: Math.round(all.reduce((s, d) => s + d.value, 0) / n) },
    };
  });
}

// What a set of adds, drops and IR moves does to my team this week and long
// term, and every rule it would break. Sleeper still has the final say.
export function simulate({ scenario, rosterId, rosters, slots, limits, week, value, injury }: SimInput): Simulation | null {
  const roster = rosters.find((r) => r.roster_id === rosterId);
  if (!roster) return null;
  const mine = new Set(roster.players ?? []);
  const rostered = new Set(rosters.flatMap((r) => r.players ?? []));
  const onIr = new Set(roster.reserve ?? []);
  const problems: Problem[] = [];

  for (const id of scenario.adds) {
    if (rostered.has(id)) problems.push({ kind: "rostered", id });
    else if (week(id).locked) problems.push({ kind: "locked", id });
  }
  for (const id of [...scenario.drops, ...scenario.ir]) {
    if (!mine.has(id)) problems.push({ kind: "not-mine", id });
    else if (week(id).locked) problems.push({ kind: "locked", id });
  }
  for (const id of scenario.ir) {
    if (mine.has(id) && !onIr.has(id) && !limits.irStatuses.includes(injury(id) ?? "")) problems.push({ kind: "not-ir-eligible", id });
  }

  const adds = scenario.adds.filter((id) => !rostered.has(id));
  const taxi = new Set(roster.taxi ?? []);
  const toIr = scenario.ir.filter((id) => mine.has(id) && !onIr.has(id) && !taxi.has(id) && !scenario.drops.includes(id));
  const after = moveRoster(roster, scenario.drops.filter((id) => mine.has(id)), adds, toIr);
  const side = sideOf(roster, after, slots, week, value);
  problems.push(...overLimits(side.counts, limits));

  return { mine: side, depth: depthTable(roster, after, rosters, week, value), problems };
}
