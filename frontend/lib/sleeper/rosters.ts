import { LEAGUE_ID } from "@/lib/config";

interface Roster {
  roster_id: number;
  owner_id: string | null;
  co_owners: string[] | null;
}

export async function getRosters(): Promise<Roster[]> {
  const res = await fetch(`https://api.sleeper.app/v1/league/${LEAGUE_ID}/rosters`);
  if (!res.ok) throw new Error(`Sleeper rosters failed (${res.status})`);
  return res.json() as Promise<Roster[]>;
}

// The roster this Sleeper user owns or co-owns in the current league, if any.
export const rosterOf = (rosters: Roster[], sleeperUserId: string) =>
  rosters.find((r) => r.owner_id === sleeperUserId || r.co_owners?.includes(sleeperUserId))?.roster_id ?? null;
