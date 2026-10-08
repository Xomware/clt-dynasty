import { leagueWeek } from "@/lib/league/default-week";
import type { SleeperLeague, SleeperNflState } from "@/lib/sleeper/types";

export interface PostCheck {
  label: string;
  value: string;
}

// The intro's power-on self test, read off the league. It prints before
// Sleeper may have answered, so every line has a value without the data; the
// real one replaces it when it lands.
export function postChecks(league?: SleeperLeague, nfl?: SleeperNflState): PostCheck[] {
  const divisions = Object.entries(league?.metadata ?? {})
    .filter(([k]) => k.startsWith("division_"))
    .sort(([a], [b]) => a.localeCompare(b, "en", { numeric: true }))
    .map(([, name]) => name);
  const teams = league?.total_rosters ?? 12;
  const superflex = league ? league.roster_positions.includes("SUPER_FLEX") : true;
  const taxi = league?.settings.taxi_slots;
  const week = league && nfl && league.status === "in_season" && nfl.season_type === "regular" ? leagueWeek(league, nfl) : null;

  return [
    { label: "Detecting teams", value: `${teams} found` },
    { label: "Detecting divisions", value: divisions.length ? divisions.join(", ") : "OK" },
    { label: "Roster slots", value: league ? `${league.roster_positions.length} OK` : "OK" },
    { label: "Scoring", value: `${superflex ? "Superflex, " : ""}${pprName(league?.scoring_settings.rec)}` },
    { label: "Taxi squads", value: typeof taxi === "number" ? `${taxi} slots OK` : "OK" },
    week ? { label: `Loading Week ${week} matchups`, value: `${teams / 2} OK` } : { label: "Loading the league", value: "OK" },
  ];
}

function pprName(rec: number | undefined) {
  if (rec === undefined || rec === 1) return "full PPR";
  if (rec === 0.5) return "half PPR";
  return rec === 0 ? "standard" : `${rec} PPR`;
}
