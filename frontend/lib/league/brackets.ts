import type { SleeperBracketMatch, SleeperNflState } from "@/lib/sleeper/types";

export interface Slot {
  rosterId: number | null;
  seed: number | null;
  // Which earlier game feeds this slot, e.g. "Winner of game 1".
  from: string | null;
}

export interface Match {
  id: number;
  round: number;
  a: Slot;
  b: Slot;
  winner: number | null;
  loser: number | null;
}

export interface Bracket {
  rounds: Match[][];
  byes: Slot[];
}

// The rulebook has no consolation games and no third-place match, so
// Sleeper's placement games (p=3, p=5) are left out; the final is p=1.
export function fromSleeper(bracket: SleeperBracketMatch[], seeds: number[]): Bracket {
  const from = (f: SleeperBracketMatch["t1_from"]) =>
    f?.w ? `Winner of game ${f.w}` : f?.l ? `Loser of game ${f.l}` : null;
  const slot = (id: number | null, f: SleeperBracketMatch["t1_from"]): Slot => ({
    rosterId: id,
    seed: id === null ? null : seeds.indexOf(id) + 1 || null,
    from: from(f),
  });

  const rounds: Match[][] = [];
  const games = bracket.filter((g) => g.p === undefined || g.p === 1).sort((x, y) => x.r - y.r || x.m - y.m);
  for (const g of games) {
    (rounds[g.r - 1] ??= []).push({
      id: g.m,
      round: g.r,
      a: slot(g.t1, g.t1_from),
      b: slot(g.t2, g.t2_from),
      winner: g.w,
      loser: g.l,
    });
  }
  // A known team entering after round 1 with no feeder game had a bye.
  const byes = rounds
    .slice(1)
    .flat()
    .flatMap((m) => [m.a, m.b])
    .filter((s) => s.rosterId !== null && s.from === null)
    .sort((x, y) => (x.seed ?? 0) - (y.seed ?? 0));
  return { rounds: rounds.filter(Boolean), byes };
}

// The rulebook's final order: champion, runner-up, then each round's losers,
// later rounds first and the better seed first within a round. Null until
// the final is decided.
export function finishOrder(bracket: Bracket, seeds: number[]): number[] | null {
  const final = bracket.rounds.at(-1)?.[0];
  if (!final?.winner || !final.loser) return null;
  const order = [final.winner, final.loser];
  for (const round of bracket.rounds.slice(0, -1).reverse()) {
    const out = round.flatMap((m) => (m.loser === null ? [] : [m.loser]));
    order.push(...out.sort((x, y) => seeds.indexOf(x) - seeds.indexOf(y)));
  }
  return order;
}

// The last fantasy week whose results are final, for the league's season.
export function lastFinishedWeek(nfl: SleeperNflState, season: string): number {
  if (nfl.season > season) return Infinity;
  if (nfl.season < season || nfl.season_type === "pre") return 0;
  return nfl.season_type === "regular" ? nfl.week - 1 : Infinity;
}
