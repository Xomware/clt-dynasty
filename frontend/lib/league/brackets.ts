import type { SleeperBracketMatch, SleeperNflState } from "@/lib/sleeper/types";

export interface Slot {
  rosterId: number | null;
  seed: number | null;
  // The game whose winner fills this slot; null for a team placed by seed.
  feeder: number | null;
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
  const slot = (id: number | null, f: SleeperBracketMatch["t1_from"]): Slot => ({
    rosterId: id,
    seed: id === null ? null : seeds.indexOf(id) + 1 || null,
    feeder: f?.w ?? null,
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
    .filter((s) => s.rosterId !== null && s.feeder === null)
    .sort((x, y) => (x.seed ?? 0) - (y.seed ?? 0));
  return { rounds: rounds.filter(Boolean), byes };
}

// The bracket if the season ended today, numbered like Sleeper's draw: seeds
// 1 and 2 sit out the wild card round and meet the 4/5 and 3/6 winners.
export function projectedBracket(seeds: number[]): Bracket {
  const seeded = (n: number): Slot => ({ rosterId: seeds[n - 1] ?? null, seed: n, feeder: null });
  const winnerOf = (m: number): Slot => ({ rosterId: null, seed: null, feeder: m });
  const match = (id: number, round: number, a: Slot, b: Slot): Match => ({ id, round, a, b, winner: null, loser: null });
  return {
    rounds: [
      [match(1, 1, seeded(4), seeded(5)), match(2, 1, seeded(6), seeded(3))],
      [match(3, 2, seeded(1), winnerOf(1)), match(4, 2, seeded(2), winnerOf(2))],
      [match(6, 3, winnerOf(3), winnerOf(4))],
    ],
    byes: [seeded(1), seeded(2)],
  };
}

export type Cell =
  | { kind: "game"; match: Match; rows: [number, number]; joins: [number, number] | null }
  | { kind: "bye"; slot: Slot; rows: [number, number] };

// Lays the bracket out as a tree from the final back: one column per round,
// each first-round game or bye a two-row leaf, and every later game spanning
// its feeders' rows. `joins` are the feeders' centres as fractions of the
// game's own height, where the connector lines meet it.
export function bracketColumns(bracket: Bracket): Cell[][] {
  const final = bracket.rounds.at(-1)?.[0];
  if (!final) return [];
  const byId = new Map(bracket.rounds.flat().map((m) => [m.id, m]));
  const columns: Cell[][] = bracket.rounds.map(() => []);
  let leaves = 0;
  const leaf = (): [number, number] => [leaves * 2, ++leaves * 2];

  const place = (m: Match, col: number): [number, number] => {
    const cell: Cell = { kind: "game", match: m, rows: [0, 0], joins: null };
    const kids: [number, number][] = [];
    if (col > 0) {
      for (const s of [m.a, m.b]) {
        const feeder = s.feeder === null ? undefined : byId.get(s.feeder);
        if (feeder) kids.push(place(feeder, col - 1));
        else {
          const rows = leaf();
          columns[col - 1].push({ kind: "bye", slot: s, rows });
          kids.push(rows);
        }
      }
    }
    columns[col].push(cell);
    if (kids.length === 0) return (cell.rows = leaf());
    const [start, end] = [kids[0][0], kids.at(-1)![1]];
    cell.rows = [start, end];
    cell.joins = [kids[0], kids.at(-1)!].map(([a, b]) => ((a + b) / 2 - start) / (end - start)) as [number, number];
    return cell.rows;
  };
  place(final, bracket.rounds.length - 1);
  for (const col of columns) col.sort((x, y) => x.rows[0] - y.rows[0]);
  return columns;
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
