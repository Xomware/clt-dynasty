import { sharedResource } from "@/lib/shared-resource";

// Dynasty, superflex, 12 teams, full PPR: the closest public proxy for CLT's
// TE-premium scoring. The same endpoint the Angular and iOS apps used.
const ENDPOINT = "https://api.fantasycalc.com/values/current?isDynasty=true&numQbs=2&numTeams=12&ppr=1";

// Dynasty values move slowly.
const MAX_AGE = 12 * 60 * 60 * 1000;

interface FantasyCalcRow {
  player: { sleeperId?: string | null; position?: string | null; name?: string | null };
  value: number;
}

export interface Values {
  // By Sleeper player id. A player FantasyCalc doesn't list is worth 0.
  players: Map<string, { value: number; position: string | null }>;
  // By FantasyCalc's pick name, like "2027 1st (Early)".
  picks: Map<string, number>;
}

export function parseValues(rows: FantasyCalcRow[]): Values {
  const players: Values["players"] = new Map();
  const picks: Values["picks"] = new Map();
  for (const { player, value } of rows) {
    const id = player.sleeperId?.trim();
    if (!id || player.position?.toUpperCase() === "PICK") {
      if (player.name?.trim()) picks.set(player.name, value ?? 0);
      continue;
    }
    players.set(id, { value: value ?? 0, position: player.position ?? null });
  }
  return { players, picks };
}

export const values = sharedResource(async () => {
  const res = await fetch(ENDPOINT);
  if (!res.ok) throw new Error(`FantasyCalc failed (${res.status})`);
  return { status: "ok" as const, values: parseValues((await res.json()) as FantasyCalcRow[]) };
}, MAX_AGE);

export const valueOf = (v: Values, id: string) => v.players.get(id)?.value ?? 0;
