import type { Player } from "@/lib/api/players";

export interface Slot {
  id: string;
  label: string;
  // x: the spot's center, in percent across from the left sideline; wide: the
  // same on a wider field, where tokens leave room to tighten up.
  // row: how far behind the line of scrimmage its token starts, in token rows.
  x: number;
  wide?: number;
  row: number;
  // Starter first.
  players: Player[];
}

// Shotgun 11 personnel attacking up the page. The line (LT to RT) sits on the
// line of scrimmage at OL_X; the TE is attached past RT, the X split wide left
// on the line, Z wide right a step back with the slot inside him off the line,
// the QB five yards behind the center and the RB beside him. Spots are spaced
// so a phone's 4rem tokens never touch; the kicker plays in special teams.
const SPOTS = [
  { id: "X", label: "X receiver", x: 11.5, wide: 9, row: 0 },
  { id: "TE", label: "Tight end", x: 65, wide: 62, row: 0 },
  { id: "Z", label: "Z receiver", x: 89.5, wide: 92, row: 0.12 },
  { id: "QB", label: "Quarterback", x: 40, row: 0.85 },
  { id: "SLOT", label: "Slot receiver", x: 79, row: 1.1 },
  { id: "RB", label: "Running back", x: 17, wide: 22, row: 1.15 },
  { id: "K", label: "Kicker", x: 0, row: 0 },
];

// LT, LG, C, RG, RT.
export const OL_X = [28, 34, 40, 46, 52];
export const SPECIAL_TEAMS = new Set(["K"]);

// Sleeper's receiver slots: left (split end), right (flanker) and slot.
const WR_SLOT: Record<string, string> = { LWR: "X", RWR: "Z", SWR: "SLOT" };
const WR_SLOTS = ["X", "Z", "SLOT"];

const LAST = Number.MAX_SAFE_INTEGER;
const byDepth = (a: Player, b: Player) => (a.depth_chart_order ?? LAST) - (b.depth_chart_order ?? LAST) || (a.search_rank ?? LAST) - (b.search_rank ?? LAST);

// The team's charted players in formation. Receivers go to their Sleeper slot
// when the list carries it; otherwise (and for anyone without one) the chart's
// receiver order deals them out X, Z, slot, X, ... Empty spots are dropped.
export function formation(players: Record<string, Player>, team: string): Slot[] {
  const charted = Object.values(players)
    .filter((p) => p.team === team && p.depth_chart_order !== undefined)
    .sort(byDepth);
  const bySlot = new Map<string, Player[]>(SPOTS.map((s) => [s.id, []]));
  const unslotted: Player[] = [];
  for (const p of charted) {
    if (p.position === "WR") {
      const slot = WR_SLOT[p.depth_chart_position ?? ""];
      if (slot) bySlot.get(slot)!.push(p);
      else unslotted.push(p);
    } else if (p.position && bySlot.has(p.position)) {
      bySlot.get(p.position)!.push(p);
    }
  }
  for (const p of unslotted) {
    const thinnest = WR_SLOTS.reduce((a, b) => (bySlot.get(b)!.length < bySlot.get(a)!.length ? b : a));
    bySlot.get(thinnest)!.push(p);
  }
  return SPOTS.map((s) => ({ ...s, players: bySlot.get(s.id)! })).filter((s) => s.players.length > 0);
}
