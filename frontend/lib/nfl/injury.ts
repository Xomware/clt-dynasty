import type { Player } from "@/lib/api/players";

export interface Designation {
  code: string;
  label: string;
}

// Sleeper's injury_status values. NA is Sleeper's catch-all for a player who
// isn't active for a reason other than an injury: non-football injury,
// personal leave, the exempt list.
const DESIGNATIONS: Record<string, Designation> = {
  Questionable: { code: "Q", label: "Questionable" },
  Doubtful: { code: "D", label: "Doubtful" },
  Out: { code: "O", label: "Out" },
  IR: { code: "IR", label: "Injured reserve" },
  PUP: { code: "PUP", label: "Physically unable to perform" },
  NFI: { code: "NFI", label: "Non-football injury" },
  Sus: { code: "SUS", label: "Suspended" },
  COV: { code: "COV", label: "COVID-19 list" },
  NA: { code: "NA", label: "Not active" },
  DNR: { code: "DNR", label: "Did not report" },
};

// The legend's order: game-week designations, then the lists.
export const LEGEND = ["Questionable", "Doubtful", "Out", "IR", "PUP", "NFI", "Sus", "COV", "NA"].map((k) => DESIGNATIONS[k]);

// Sleeper files a non-football injury under the player's status, not his injury.
export function designation(p: Pick<Player, "injury_status"> & { status?: string | null }): Designation | null {
  if (p.status === "Non Football Injury") return DESIGNATIONS.NFI;
  const s = p.injury_status;
  if (!s) return null;
  return DESIGNATIONS[s] ?? { code: s.slice(0, 3).toUpperCase(), label: s };
}

// "Out: Hamstring" for a badge's accessible name and tooltip.
export const designationText = (d: Designation, bodyPart?: string | null) => (bodyPart ? `${d.label}: ${bodyPart}` : d.label);

// Q and D may still play; everything else keeps him off the field this week.
export const sidelined = (d: Designation) => d.code !== "Q" && d.code !== "D";
