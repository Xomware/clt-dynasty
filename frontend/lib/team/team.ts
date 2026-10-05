import { type Player, type PlayerMap, playerName } from "@/lib/players";
import type { SleeperLeague, SleeperRoster, SleeperUser } from "@/lib/sleeper/league";

export const POSITION_ORDER = ["QB", "RB", "WR", "TE", "K", "DEF"];

const SLOT_LABELS: Record<string, string> = { SUPER_FLEX: "SF", REC_FLEX: "W/T", WRRB_FLEX: "W/R" };
export const slotLabel = (slot: string) => SLOT_LABELS[slot] ?? slot;

export const ownerOf = (roster: SleeperRoster | undefined, users: SleeperUser[]) =>
  users.find((u) => u.user_id === roster?.owner_id);

export function teamName(roster: SleeperRoster | undefined, users: SleeperUser[], rosterId: number): string {
  const user = ownerOf(roster, users);
  return user?.metadata?.team_name || user?.display_name || `Team ${rosterId}`;
}

export const pointsFor = ({ settings: s }: SleeperRoster) => (s.fpts ?? 0) + (s.fpts_decimal ?? 0) / 100;
export const pointsAgainst = ({ settings: s }: SleeperRoster) => (s.fpts_against ?? 0) + (s.fpts_against_decimal ?? 0) / 100;

const winPct = ({ settings: s }: SleeperRoster) => {
  const games = s.wins + s.losses + s.ties;
  return games ? (s.wins + s.ties / 2) / games : 0;
};

// Record first, then points for. Sleeper's own tiebreakers vary by league
// setting; this is the order its standings show by default.
export const sortByRecord = (rosters: SleeperRoster[]) =>
  [...rosters].sort((a, b) => winPct(b) - winPct(a) || pointsFor(b) - pointsFor(a) || a.roster_id - b.roster_id);

export function rankOf(rosters: SleeperRoster[], rosterId: number) {
  const roster = rosters.find((r) => r.roster_id === rosterId);
  if (!roster) return null;
  const league = sortByRecord(rosters);
  const division = roster.settings.division;
  const rivals = division === undefined ? [] : league.filter((r) => r.settings.division === division);
  return {
    league: league.indexOf(roster) + 1,
    of: league.length,
    division: division === undefined ? null : { rank: rivals.indexOf(roster) + 1, of: rivals.length },
  };
}

export const divisionName = (league: SleeperLeague, division: number | undefined) =>
  division === undefined ? null : (league.metadata?.[`division_${division}`] ?? `Division ${division}`);

export function streakOf(roster: SleeperRoster): { length: number; result: "W" | "L" | "T" } | null {
  const m = /^(\d+)([WLT])$/.exec(roster.metadata?.streak ?? "");
  return m ? { length: Number(m[1]), result: m[2] as "W" | "L" | "T" } : null;
}

export const ordinal = (n: number) => `${n}${["th", "st", "nd", "rd"][n % 100 > 10 && n % 100 < 14 ? 0 : n % 10] ?? "th"}`;

const byPosition = (players: PlayerMap) => (a: string, b: string) => {
  const rank = (id: string) => {
    const i = POSITION_ORDER.indexOf(players[id]?.position ?? "");
    return i === -1 ? POSITION_ORDER.length : i;
  };
  return rank(a) - rank(b) || playerName(players[a], a).localeCompare(playerName(players[b], b));
};

export interface Starter {
  slot: string;
  // null for a slot the manager left empty.
  id: string | null;
}

export interface RosterGroups {
  starters: Starter[];
  bench: string[];
  taxi: string[];
  reserve: string[];
}

export function rosterGroups(roster: SleeperRoster, league: SleeperLeague, players: PlayerMap): RosterGroups {
  const slots = league.roster_positions.filter((p) => p !== "BN");
  const starters = slots.map((slot, i) => {
    const id = roster.starters?.[i];
    return { slot, id: id && id !== "0" ? id : null };
  });
  const taxi = roster.taxi ?? [];
  const reserve = roster.reserve ?? [];
  const placed = new Set([...starters.flatMap((s) => (s.id ? [s.id] : [])), ...taxi, ...reserve]);
  const sort = byPosition(players);
  return {
    starters,
    bench: (roster.players ?? []).filter((id) => !placed.has(id)).sort(sort),
    taxi: [...taxi].sort(sort),
    reserve: [...reserve].sort(sort),
  };
}

// The roster this Sleeper user owns or co-owns, if any.
export const rosterOwnedBy = (rosters: SleeperRoster[], userId: string) =>
  rosters.find((r) => r.owner_id === userId || r.co_owners?.includes(userId));

// Sleeper's injury words, short enough for a tag.
const INJURY: Record<string, string> = { Questionable: "Q", Doubtful: "D", Out: "Out", IR: "IR", PUP: "PUP", Sus: "Sus", NA: "NA", COV: "COV" };
export const injuryTag = (player: Player | undefined) => (player?.injury_status ? (INJURY[player.injury_status] ?? player.injury_status) : null);
