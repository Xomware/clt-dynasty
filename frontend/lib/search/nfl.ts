import type { Player } from "@/lib/api/players";
import { NFL_TEAMS, type NflTeam } from "@/lib/nfl/teams";

// "Ja'Marr" finds "jamarr", "A.J." finds "aj", "Amon-Ra St. Brown" splits into words.
export const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/['’.]/g, "");

const words = (s: string) =>
  fold(s)
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

// A query word scores 3 on a whole name word, 2 on the start of one, 1 inside
// the run-together name ("stbrown") once it's three letters long, so a stray
// letter doesn't match every name; a word with none of these sinks the row.
function wordScore(query: string[], name: string[]): number {
  const joined = name.join("");
  let total = 0;
  for (const w of query) {
    const hit = name.includes(w) ? 3 : name.some((n) => n.startsWith(w)) ? 2 : w.length >= 3 && joined.includes(w) ? 1 : 0;
    if (!hit) return 0;
    total += hit;
  }
  return total;
}

interface Entry {
  player: Player;
  name: string[];
}

// Built once per players map: about 4,300 rows, re-scored on every keystroke.
const indexes = new WeakMap<Record<string, Player>, Entry[]>();

function indexOf(players: Record<string, Player>): Entry[] {
  let index = indexes.get(players);
  if (!index) {
    index = Object.values(players)
      // A defense is its NFL team, which the teams list already finds.
      .filter((p) => p.position !== "DEF" && (p.first_name || p.last_name))
      .map((player) => ({ player, name: words(`${player.first_name ?? ""} ${player.last_name ?? ""}`) }));
    indexes.set(players, index);
  }
  return index;
}

const LAST = Number.MAX_SAFE_INTEGER;

export interface Hit<T> {
  item: T;
  score: number;
}

// Best match first; among equal matches a player on a team beats a free agent,
// then Sleeper's search rank puts the fantasy-relevant starter above his namesake.
export function searchPlayers(players: Record<string, Player>, query: string, limit: number): Hit<Player>[] {
  const q = words(query);
  if (q.length === 0) return [];
  return indexOf(players)
    .flatMap(({ player, name }) => {
      const score = wordScore(q, name);
      return score ? [{ item: player, score: score + (q.join("") === name.join("") ? 1 : 0) }] : [];
    })
    .sort(
      (a, b) => b.score - a.score || Number(Boolean(b.item.team)) - Number(Boolean(a.item.team)) || (a.item.search_rank ?? LAST) - (b.item.search_rank ?? LAST),
    )
    .slice(0, limit);
}

// What fans and headlines call them, beyond the city and name.
const NICKNAMES: Record<string, string[]> = {
  ARI: ["cards"],
  ATL: ["dirty birds"],
  BUF: ["mafia"],
  CAR: ["cats"],
  CHI: ["monsters"],
  CIN: ["cincy"],
  DAL: ["boys", "americas team"],
  GB: ["pack", "cheeseheads"],
  IND: ["horseshoe"],
  JAX: ["jags", "duval"],
  LAC: ["bolts"],
  LV: ["vegas"],
  MIA: ["fins", "phins"],
  NE: ["pats"],
  NO: ["nola", "who dat"],
  NYG: ["big blue", "g men"],
  PHI: ["birds", "philly"],
  PIT: ["steel city"],
  SEA: ["hawks", "12s"],
  SF: ["niners"],
  TB: ["bucs", "tampa"],
  WAS: ["dc"],
};

export function searchNflTeams(query: string): Hit<NflTeam>[] {
  const q = words(query);
  if (q.length === 0) return [];
  return NFL_TEAMS.flatMap((team) => {
    // "LAC" alone is the team, worth more than any word match.
    if (q.length === 1 && q[0] === team.abbr.toLowerCase()) return [{ item: team, score: 3 * q.length + 2 }];
    const names = [`${team.city} ${team.name}`, ...(NICKNAMES[team.abbr] ?? [])].map(words);
    const score = Math.max(...names.map((n) => wordScore(q, n)));
    return score ? [{ item: team, score }] : [];
  }).sort((a, b) => b.score - a.score);
}
