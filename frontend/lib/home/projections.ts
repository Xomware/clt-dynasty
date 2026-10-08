import type { Player } from "@/lib/api/players";
import type { SleeperGame, SleeperStatRow } from "@/lib/sleeper/types";

// Statuses that keep a player out of the game; Questionable and Doubtful still project.
const OUT = new Set(["Out", "IR", "PUP", "Sus", "NA", "DNR", "COV"]);

export interface PlayerWeek {
  points: number;
  position: string;
  // Every position Sleeper lets him start at, the primary one first.
  positions: string[];
  team: string | null;
  injury: string | null;
  bye: boolean;
  // His game has kicked off, so Sleeper won't move him in or out of a lineup.
  locked: boolean;
}

// The projected stat line scored with the league's own settings, so a TE's
// reception bonus counts the way it will on Sunday. One decimal, as Sleeper shows it.
export function scoreProjection(stats: Record<string, number>, scoring: Record<string, number>): number {
  const total = Object.entries(stats).reduce((sum, [key, n]) => sum + n * (scoring[key] ?? 0), 0);
  return Math.round(total * 10) / 10;
}

export const isOut = (w: PlayerWeek) => w.bye || (w.injury !== null && OUT.has(w.injury));

// Every player's week: projection, injury (the projection's is fresher than
// the nightly player list), bye and kickoff from that week's schedule.
export function weekBoard(
  rows: SleeperStatRow[],
  players: Record<string, Player>,
  scoring: Record<string, number>,
  games: SleeperGame[],
  week: number,
): (id: string) => PlayerWeek {
  const byId = new Map(rows.map((r) => [r.player_id, r]));
  const thisWeek = games.filter((g) => g.week === week && g.status !== "canceled");
  const playing = new Map(thisWeek.flatMap((g) => [[g.home, g], [g.away, g]]));
  const memo = new Map<string, PlayerWeek>();

  return (id) => {
    const hit = memo.get(id);
    if (hit) return hit;
    const row = byId.get(id);
    const p = players[id];
    const team = row?.team ?? p?.team ?? null;
    const game = team ? playing.get(team) : undefined;
    const position = (row?.player?.position ?? p?.position ?? "").toUpperCase();
    const w: PlayerWeek = {
      points: row ? scoreProjection(row.stats, scoring) : 0,
      position,
      positions: [...new Set([position, ...(row?.player?.fantasy_positions ?? [])])],
      team,
      injury: row?.player?.injury_status || p?.injury_status || null,
      // Without a schedule nobody is on bye; the projection is still 0.
      bye: team !== null && thisWeek.length > 0 && !game,
      locked: game !== undefined && game.status !== "pre_game",
    };
    if (isOut(w)) w.points = 0;
    memo.set(id, w);
    return w;
  };
}
