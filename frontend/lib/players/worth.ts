import { bestLineup, canFill } from "@/lib/home/lineup";
import type { PlayerWeek } from "@/lib/home/projections";
import { FLOOR, MARGIN, POINT_VALUE } from "@/lib/home/waivers";
import type { SleeperRoster } from "@/lib/sleeper/types";

export type Verdict = "starter" | "depth" | "stash" | "none";

export interface Worth {
  verdict: Verdict;
  position: string;
  // Projected points he adds to your best lineup this week; 0 when he'd sit.
  gain: number;
  // The slot he'd start in, if he would.
  slot: string | null;
  // Your lowest-valued rostered player at his position, the dynasty yardstick.
  floor: { id: string; value: number } | null;
  valueDelta: number;
}

export interface TeamInput {
  slots: string[];
  roster: SleeperRoster;
  week: (id: string) => PlayerWeek;
  value: (id: string) => number;
}

export const round1 = (n: number) => Math.round(n * 10) / 10;

// The players a roster can start this week: starters whose games have kicked
// off stay where they are, everyone else active (not taxi, not IR) is in the pool.
export function lineupBase({ slots, roster, week }: Omit<TeamInput, "value">) {
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

// Sizes up any player not on the team: would he start this week, is he better
// depth than the weakest bench player at his position, or a better dynasty
// asset than the lowest-valued one. The thresholds are Home's waiver wire's.
export function worthFor(team: TeamInput): (id: string) => Worth {
  const { slots, roster, week, value } = team;
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

  return (id) => {
    const pos = position(id);
    const none: Worth = { verdict: "none", position: pos ?? week(id).position, gain: 0, slot: null, floor: null, valueDelta: 0 };
    if (!pos) return none;

    const at = mine.filter((p) => p !== id && position(p) === pos);
    const lowest = at.reduce<string | null>((low, p) => (low === null || value(p) < value(low) ? p : low), null);
    const floor = lowest === null ? null : { id: lowest, value: value(lowest) };
    const valueDelta = value(id) - (floor?.value ?? 0);

    const withHim = week(id).locked ? base : bestLineup(slots, fixed, [...pool, id], week, prefer);
    const gain = round1(lineupPoints(withHim, week) - baseTotal);
    const slot = withHim.indexOf(id);
    const worth = { ...none, position: pos, floor, valueDelta };
    if (gain >= 0.5 && slot >= 0) return { ...worth, verdict: "starter", gain, slot: slots[slot] };

    // The bench player he'd push down: the weakest active one at his position who isn't starting.
    const bench = pool.filter((p) => !inLineup.has(p) && position(p) === pos).sort((a, b) => merit(a) - merit(b))[0];
    const benchPoints = bench ? week(bench).points : 0;
    const benchMerit = bench ? merit(bench) : 0;
    if (week(id).points > benchPoints && merit(id) > benchMerit * MARGIN + FLOOR) return { ...worth, verdict: "depth" };
    if (value(id) > (floor?.value ?? 0) * MARGIN + FLOOR) return { ...worth, verdict: "stash" };
    return worth;
  };
}
