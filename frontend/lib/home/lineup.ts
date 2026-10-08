import { isOut, type PlayerWeek } from "./projections";

// Who Sleeper lets into each starting slot.
const SLOT_POSITIONS: Record<string, readonly string[]> = {
  FLEX: ["RB", "WR", "TE"],
  WRRB_FLEX: ["WR", "RB"],
  REC_FLEX: ["WR", "TE"],
  SUPER_FLEX: ["QB", "RB", "WR", "TE"],
};

export const slotPositions = (slot: string) => SLOT_POSITIONS[slot] ?? [slot];
export const canFill = (slot: string, position: string) => slotPositions(slot).includes(position);

export type Flag = "empty" | "out" | "bye" | "doubtful" | "outscored";

export interface StarterCheck {
  slot: string;
  id: string | null;
  points: number;
  flags: Flag[];
}

// Bench `out` (null for an empty slot) and start `in` at `slot`. When `in`
// can't play the slot `out` leaves, a starter slides over to make room.
export interface Swap {
  slot: string;
  out: string | null;
  outPoints: number;
  in: string;
  inPoints: number;
  move?: { id: string; to: string };
}

export interface LineupCheck {
  starters: StarterCheck[];
  swaps: Swap[];
  projected: number;
  best: number;
}

const sum = (ns: number[]) => Math.round(ns.reduce((a, b) => a + b, 0) * 10) / 10;

// `starters` is the roster's lineup in slot order, "0" for an empty slot;
// `bench` is everyone else who could start (not taxi or IR).
export function checkLineup(slots: string[], starters: string[], bench: string[], week: (id: string) => PlayerWeek): LineupCheck {
  const ids = slots.map((_, i) => (starters[i] && starters[i] !== "0" ? starters[i] : null));
  const starting = new Set(ids.filter((id): id is string => id !== null));
  const locked = (id: string | null) => id !== null && week(id).locked;
  // Sleeper's fantasy positions: a two-way player can start at either.
  const fits = (slot: string, id: string) => week(id).positions.some((p) => canFill(slot, p));

  // The best lineup Sleeper allows. Locked starters stay put; the rest fill the
  // narrowest slots first, each with the best player left who can play it.
  // Slot sets nest (QB in SUPER_FLEX, RB in FLEX in SUPER_FLEX), so this is optimal.
  const best = ids.map((id) => (locked(id) ? id : null));
  const used = new Set(best.filter((id): id is string => id !== null));
  const pool = [...new Set([...starting, ...bench])].filter((id) => !locked(id));
  const rank = (a: string, b: string) =>
    week(b).points - week(a).points ||
    Number(isOut(week(a))) - Number(isOut(week(b))) ||
    Number(starting.has(b)) - Number(starting.has(a));
  const order = slots.map((_, i) => i).filter((i) => best[i] === null);
  order.sort((a, b) => slotPositions(slots[a]).length - slotPositions(slots[b]).length);
  for (const i of order) {
    const pick = pool.filter((id) => !used.has(id) && fits(slots[i], id)).sort(rank)[0];
    if (!pick) continue;
    best[i] = pick;
    used.add(pick);
  }

  const leaving = ids
    .map((id, i) => ({ slot: slots[i], id, points: id ? week(id).points : 0 }))
    .filter((s) => !locked(s.id) && (s.id === null || !used.has(s.id)))
    .sort((a, b) => a.points - b.points);
  const entering = [...used].filter((id) => !starting.has(id)).sort((a, b) => week(b).points - week(a).points);

  const swaps: Swap[] = [];
  for (const id of entering) {
    const at = Math.max(0, leaving.findIndex((d) => fits(d.slot, id)));
    const [d] = leaving.splice(at, 1);
    if (!d) break;
    const swap: Swap = { slot: d.slot, out: d.id, outPoints: d.points, in: id, inPoints: week(id).points };
    if (!fits(d.slot, id)) {
      const j = ids.findIndex((c, k) => c !== null && used.has(c) && fits(slots[k], id) && fits(d.slot, c));
      const slide = ids[j];
      if (slide) {
        swap.slot = slots[j];
        swap.move = { id: slide, to: d.slot };
      }
    }
    swaps.push(swap);
  }

  const benched = new Set(swaps.filter((s) => s.inPoints > s.outPoints).map((s) => s.out));
  const checks = ids.map((id, i): StarterCheck => {
    if (id === null) return { slot: slots[i], id, points: 0, flags: ["empty"] };
    const w = week(id);
    const flags: Flag[] = [];
    if (w.bye) flags.push("bye");
    else if (isOut(w)) flags.push("out");
    else if (w.injury === "Doubtful") flags.push("doubtful");
    if (benched.has(id)) flags.push("outscored");
    return { slot: slots[i], id, points: w.points, flags };
  });

  return {
    starters: checks,
    swaps,
    projected: sum(checks.map((c) => c.points)),
    best: sum(best.map((id) => (id ? week(id).points : 0))),
  };
}
