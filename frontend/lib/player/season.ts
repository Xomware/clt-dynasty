import type { SleeperGame, SleeperMatchup, SleeperRoster } from "@/lib/sleeper/types";

export interface FantasyWeek {
  rosterId: number;
  points: number;
  started: boolean;
  // The roster he played against; null in a week with no game, as in the playoffs.
  opponent: number | null;
}

// Whose roster he was on in one week of matchups, and what he scored there.
export function fantasyWeek(rows: SleeperMatchup[], id: string): FantasyWeek | null {
  const mine = rows.find((r) => r.players?.includes(id));
  if (!mine) return null;
  const them = mine.matchup_id === null ? undefined : rows.find((r) => r.matchup_id === mine.matchup_id && r.roster_id !== mine.roster_id);
  return {
    rosterId: mine.roster_id,
    points: mine.players_points?.[id] ?? 0,
    started: mine.starters?.includes(id) ?? false,
    opponent: them?.roster_id ?? null,
  };
}

export type RosterSlot = "Starter" | "Bench" | "Taxi squad" | "Injured reserve";

export function rosterSpot(rosters: SleeperRoster[], id: string): { rosterId: number; slot: RosterSlot } | null {
  const roster = rosters.find((r) => r.players?.includes(id));
  if (!roster) return null;
  const slot = roster.taxi?.includes(id)
    ? "Taxi squad"
    : roster.reserve?.includes(id)
      ? "Injured reserve"
      : roster.starters?.includes(id)
        ? "Starter"
        : "Bench";
  return { rosterId: roster.roster_id, slot };
}

export type NflGame = { opponent: string; home: boolean } | "bye";

// null when the schedule has no games that week at all.
export function nflGame(schedule: SleeperGame[], team: string, week: number): NflGame | null {
  const games = schedule.filter((g) => g.week === week && g.status !== "canceled");
  if (games.length === 0) return null;
  const game = games.find((g) => g.home === team || g.away === team);
  if (!game) return "bye";
  return game.home === team ? { opponent: game.away, home: true } : { opponent: game.home, home: false };
}

export function byeWeek(schedule: SleeperGame[], team: string): number | null {
  const weeks = [...new Set(schedule.map((g) => g.week))].sort((a, b) => a - b);
  return weeks.find((w) => nflGame(schedule, team, w) === "bye") ?? null;
}

// Sleeper's height is inches as a string; older records are already "6'2\"".
export function heightLabel(height: string) {
  if (!/^\d+$/.test(height)) return height;
  const inches = Number(height);
  return `${Math.floor(inches / 12)}'${inches % 12}"`;
}

type Stats = Record<string, number>;

const count = (n: number | undefined, unit: string) => (n ? `${n} ${unit}` : null);
const join = (...parts: (string | null)[]) => parts.filter(Boolean).join(", ");

const LINES: Record<string, (s: Stats) => string | null> = {
  pass: (s) => (s.pass_att ? join(`${s.pass_cmp ?? 0}/${s.pass_att} passing`, `${s.pass_yd ?? 0} yds`, count(s.pass_td, "TD"), count(s.pass_int, "INT")) : null),
  rush: (s) => (s.rush_att ? join(`${s.rush_att} car`, `${s.rush_yd ?? 0} yds`, count(s.rush_td, "TD")) : null),
  rec: (s) => (s.rec_tgt || s.rec ? join(`${s.rec ?? 0}/${s.rec_tgt ?? s.rec} rec`, `${s.rec_yd ?? 0} yds`, count(s.rec_td, "TD")) : null),
  kick: (s) => (s.fga || s.xpa ? join(s.fga ? `${s.fgm ?? 0}/${s.fga} FG` : null, s.xpa ? `${s.xpm ?? 0}/${s.xpa} XP` : null) : null),
};

const ORDER: Record<string, string[]> = {
  QB: ["pass", "rush", "rec"],
  RB: ["rush", "rec", "pass"],
  WR: ["rec", "rush", "pass"],
  TE: ["rec", "rush", "pass"],
  K: ["kick"],
};

// One week's box score line, the position's own numbers first.
export function statLine(position: string | null, stats: Stats): string {
  const parts = (ORDER[position ?? ""] ?? ["pass", "rush", "rec", "kick"]).flatMap((k) => LINES[k](stats) ?? []);
  if (stats.fum_lost) parts.push(`${stats.fum_lost} fum lost`);
  return parts.join("; ") || (stats.gp ? "No touches" : "Did not play");
}
