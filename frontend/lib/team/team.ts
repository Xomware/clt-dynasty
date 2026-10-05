import { type Player, playerName } from "@/lib/api/players";
import { sortStandings } from "@/lib/league/standings";
import type { SleeperLeague, SleeperRoster } from "@/lib/sleeper/types";

type PlayerMap = Record<string, Player>;

export const POSITION_ORDER = ["QB", "RB", "WR", "TE", "K", "DEF"];

const SLOT_LABELS: Record<string, string> = { SUPER_FLEX: "SF", REC_FLEX: "W/T", WRRB_FLEX: "W/R" };
export const slotLabel = (slot: string) => SLOT_LABELS[slot] ?? slot;

// League and division rank in the Standings window's order.
export function rankOf(rosters: SleeperRoster[], rosterId: number) {
  const league = sortStandings(rosters);
  const mine = league.find((s) => s.rosterId === rosterId);
  if (!mine) return null;
  const rivals = league.filter((s) => s.division === mine.division);
  return {
    standing: mine,
    league: league.indexOf(mine) + 1,
    of: league.length,
    division: mine.division === null ? null : { rank: rivals.indexOf(mine) + 1, of: rivals.length },
  };
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

// Sleeper's injury words, short enough for a tag.
const INJURY: Record<string, string> = { Questionable: "Q", Doubtful: "D", Out: "Out", IR: "IR", PUP: "PUP", Sus: "Sus", NA: "NA", COV: "COV" };
export const injuryTag = (player: Player | undefined) => (player?.injury_status ? (INJURY[player.injury_status] ?? player.injury_status) : null);

export const avatarUrl = (avatar: string | null | undefined) => (avatar ? `https://sleepercdn.com/avatars/thumbs/${avatar}` : null);
