import { bestLineup, canFill } from "@/lib/home/lineup";
import type { PlayerWeek } from "@/lib/home/projections";
import { FLOOR, MARGIN, POINT_VALUE } from "@/lib/home/waivers";
import type { SleeperRoster } from "@/lib/sleeper/types";

// Free agents get add verdicts; players on another CLT roster get trade ones.
export type Verdict = "starter" | "depth" | "stash" | "none" | "cornerstone" | "target" | "rental" | "nofit";

export interface Worth {
  verdict: Verdict;
  position: string;
  // Projected points he adds to your best lineup this week; 0 when he'd sit.
  gain: number;
  // The slot he'd start in, if he would.
  slot: string | null;
  // The dynasty yardstick: your lowest-valued player at his position for a
  // free agent, your lowest-valued starter there for another team's player.
  floor: { id: string; value: number } | null;
  valueDelta: number;
  age: number | null;
  points: number;
}

export interface PlayerFacts {
  age: number | null;
  yearsExp: number | null;
  // On another CLT roster, so he'd come by trade, not off the wire.
  owned: boolean;
}

export interface TeamInput {
  slots: string[];
  roster: SleeperRoster;
  week: (id: string) => PlayerWeek;
  value: (id: string) => number;
  facts: (id: string) => PlayerFacts;
  // The value FantasyCalc's 24th-best player has: two per team, the untouchables.
  elite: number;
}

// A stash is a bet on a young player: a rookie, a second-year, or 24 and under,
// worth something on FantasyCalc already.
const STASH_AGE = 24;
const STASH_MIN = 150;
const ELITE_RANK = 24;
// The age each position starts to fade at, and the weekly points that still make him worth renting.
const RENTAL_AGE: Record<string, number> = { QB: 33, RB: 28, WR: 30, TE: 30 };
const RENTAL_POINTS = 8;

export function eliteValue(values: number[]): number {
  const sorted = [...values].sort((a, b) => b - a);
  return sorted[ELITE_RANK - 1] ?? Infinity;
}

export const round1 = (n: number) => Math.round(n * 10) / 10;

// The players a roster can start this week: starters whose games have kicked
// off stay where they are, everyone else active (not taxi, not IR) is in the pool.
export function lineupBase({ slots, roster, week }: Pick<TeamInput, "slots" | "roster" | "week">) {
  const apart = new Set([...(roster.taxi ?? []), ...(roster.reserve ?? [])]);
  const active = (roster.players ?? []).filter((id) => !apart.has(id));
  const keep = new Set(active);
  const fixed = slots.map((_, i) => {
    const id = roster.starters?.[i];
    return id && id !== "0" && keep.has(id) && week(id).locked ? id : null;
  });
  const pool = active.filter((id) => !week(id).locked);
  return { fixed, pool };
}

export const lineupPoints = (lineup: (string | null)[], week: (id: string) => PlayerWeek) =>
  round1(lineup.reduce((sum, id) => sum + (id ? week(id).points : 0), 0));

// Sizes up any player not on the team. A free agent: would he start this
// week, is he better depth than the weakest bench player at his position, or
// a young player worth more than the lowest-valued one. Another team's player:
// untouchable, an aging producer to rent, or a trade target who'd start or
// out-value a starter. The margins are Home's waiver wire's.
export function worthFor(team: TeamInput): (id: string) => Worth {
  const { slots, roster, week, value, facts, elite } = team;
  const { fixed, pool } = lineupBase(team);
  const starting = new Set(roster.starters ?? []);
  const prefer = (id: string) => starting.has(id);
  const base = bestLineup(slots, fixed, pool, week, prefer);
  const baseTotal = lineupPoints(base, week);
  const inLineup = new Set(base.filter((id): id is string => id !== null));
  // A two-way player counts at the first of his positions a lineup can use.
  const position = (id: string) => week(id).positions.find((p) => slots.some((s) => canFill(s, p))) ?? null;
  const merit = (id: string) => value(id) + POINT_VALUE * week(id).points;
  const mine = roster.players ?? [];
  const lowest = (ids: string[]) => {
    const low = ids.reduce<string | null>((l, p) => (l === null || value(p) < value(l) ? p : l), null);
    return low === null ? null : { id: low, value: value(low) };
  };

  return (id) => {
    const pos = position(id);
    const { age, yearsExp, owned } = facts(id);
    const points = week(id).points;
    const none: Worth = { verdict: owned ? "nofit" : "none", position: pos ?? week(id).position, gain: 0, slot: null, floor: null, valueDelta: 0, age, points };
    if (!pos) return none;

    const withHim = week(id).locked ? base : bestLineup(slots, fixed, [...pool, id], week, prefer);
    const gain = round1(lineupPoints(withHim, week) - baseTotal);
    const at = withHim.indexOf(id);
    const slot = gain >= 0.5 && at >= 0 ? slots[at] : null;

    if (owned) {
      const trade = { ...none, position: pos, gain: slot ? gain : 0, slot };
      if (value(id) >= elite) return { ...trade, verdict: "cornerstone" };
      if ((age ?? 0) >= (RENTAL_AGE[pos] ?? Infinity)) return slot || points >= RENTAL_POINTS ? { ...trade, verdict: "rental" } : trade;
      if (slot) return { ...trade, verdict: "target" };
      const floor = lowest([...inLineup].filter((p) => position(p) === pos));
      if (floor && value(id) > floor.value * MARGIN + FLOOR) return { ...trade, verdict: "target", floor, valueDelta: value(id) - floor.value };
      return trade;
    }

    const floor = lowest(mine.filter((p) => p !== id && position(p) === pos));
    const worth = { ...none, position: pos, floor, valueDelta: value(id) - (floor?.value ?? 0) };
    if (slot) return { ...worth, verdict: "starter", gain, slot };

    // The bench player he'd push down: the weakest active one at his position who isn't starting.
    const bench = pool.filter((p) => !inLineup.has(p) && position(p) === pos).sort((a, b) => merit(a) - merit(b))[0];
    const benchPoints = bench ? week(bench).points : 0;
    const benchMerit = bench ? merit(bench) : 0;
    if (points > benchPoints && merit(id) > benchMerit * MARGIN + FLOOR) return { ...worth, verdict: "depth" };
    const young = (yearsExp ?? Infinity) <= 1 || (age ?? Infinity) <= STASH_AGE;
    if (young && value(id) >= STASH_MIN && value(id) > (floor?.value ?? 0) * MARGIN + FLOOR) return { ...worth, verdict: "stash" };
    return worth;
  };
}
