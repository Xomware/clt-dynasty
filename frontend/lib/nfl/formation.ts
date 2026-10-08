import type { Player } from "@/lib/api/players";

export interface Slot {
  id: string;
  label: string;
  // On a portrait field, in percent: x across from the left sideline to the spot's center, y down to its top.
  x: number;
  y: number;
  // Starter first.
  players: Player[];
}

// Shotgun 11 personnel, offense facing down the page: the backfield sits near
// the end zone, receivers on the line. Four columns a quarter of the field
// apart, so a phone's tokens fit side by side; spots that share a column sit a
// token's height apart. Sleeper charts no offensive line.
const SPOTS = [
  { id: "RB", label: "Running back", x: 30, y: 15 },
  { id: "K", label: "Kicker", x: 87.5, y: 14 },
  { id: "QB", label: "Quarterback", x: 50, y: 37 },
  { id: "X", label: "X receiver", x: 12.5, y: 58 },
  { id: "TE", label: "Tight end", x: 62.5, y: 58 },
  { id: "SLOT", label: "Slot receiver", x: 37.5, y: 77 },
  { id: "Z", label: "Z receiver", x: 87.5, y: 77 },
];

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
