import type { Values } from "@/lib/analyzer/values";
import { POINT_VALUE } from "@/lib/home/waivers";
import type { SleeperDraft, SleeperDraftPick, SleeperTradedPick } from "@/lib/sleeper/types";
import { ordinal } from "@/lib/team/team";

// Rulebook 3C, "Taxi squad steals": a player taken in round N costs the
// stealer the round(s) below, at minimum. The Angular site's steal button
// charged a 5th for a 1st-rounder; the rulebook's table is the rule.
const COST: Record<number, number[]> = { 1: [1, 2], 2: [1], 3: [2], 4: [3], 5: [4] };
const UNDRAFTED = [5];
// "Picks up to 2 years out can be traded" (rulebook 3E): the two drafts a steal can be paid from.
const YEARS_OUT = 2;

export interface DraftSpot {
  season: string;
  round: number;
  // Pick within the round.
  pick: number;
}

export interface Cost {
  rounds: number[];
  // Why these rounds: "Drafted 2026 3.07", "Undrafted".
  basis: string;
}

export function stealCost(spot: DraftSpot | null): Cost {
  if (!spot) return { rounds: UNDRAFTED, basis: "Undrafted" };
  const where = `${spot.season} ${spot.round}.${String(spot.pick).padStart(2, "0")}`;
  // The 2024 startup ran 30 rounds; the table stops at the rookie draft's 5th.
  if (!COST[spot.round]) return { rounds: UNDRAFTED, basis: `Startup pick ${where}, past the table, so the undrafted price` };
  return { rounds: COST[spot.round], basis: `Drafted ${where}` };
}

// Where each player was last drafted in the league, from finished drafts newest first.
export function draftSpots(drafts: { draft: SleeperDraft; picks: SleeperDraftPick[] }[]): Map<string, DraftSpot> {
  const spots = new Map<string, DraftSpot>();
  for (const { draft, picks } of drafts) {
    for (const p of picks) {
      if (spots.has(p.player_id)) continue;
      spots.set(p.player_id, { season: draft.season, round: p.round, pick: p.pick_no - (p.round - 1) * draft.settings.teams });
    }
  }
  return spots;
}

// The drafts a steal is paid from: the next two that haven't happened.
export function paySeasons(season: string, draftedThisSeason: boolean): string[] {
  const first = Number(season) + (draftedThisSeason ? 1 : 0);
  return Array.from({ length: YEARS_OUT }, (_, i) => String(first + i));
}

export interface Pick {
  season: string;
  round: number;
  // The roster the pick started with, so "your own" or whose.
  original: number;
}

// Every pick a roster holds in these drafts: its own unless traded away, plus
// those traded to it. `traded_picks` keys picks by original roster.
export function ownedPicks(rosterId: number, seasons: string[], rounds: number, rosterIds: number[], traded: SleeperTradedPick[]): Pick[] {
  const holder = new Map(traded.map((t) => [`${t.season}/${t.round}/${t.roster_id}`, t.owner_id]));
  const out: Pick[] = [];
  for (const season of seasons) {
    for (let round = 1; round <= rounds; round++) {
      for (const original of rosterIds) {
        if ((holder.get(`${season}/${round}/${original}`) ?? original) === rosterId) out.push({ season, round, original });
      }
    }
  }
  return out;
}

// FantasyCalc lists 1st to 4th; a 5th is extrapolated from the drop from 3rd to 4th.
// A season past the ones it lists takes the latest it has.
export function pickValue(picks: Values["picks"], season: string, round: number): number {
  const listed = [...picks.keys()].map((k) => /^(\d{4}) 1st$/.exec(k)?.[1]).filter((s): s is string => !!s).sort();
  const year = listed.includes(season) ? season : (listed.filter((s) => s < season).at(-1) ?? listed[0]);
  if (!year) return 0;
  const at = (r: number) => picks.get(`${year} ${ordinal(r)}`) ?? 0;
  if (round <= 4) return at(round);
  const third = at(3);
  return third ? Math.round((at(4) * at(4)) / third) : 0;
}

export interface Payment {
  picks: Pick[];
  // Rounds owed that no held pick covers.
  missing: number[];
  value: number;
}

// How a roster would pay: for each round owed, a held pick of that round, the
// sooner draft first. With none, a better round still meets the "minimum cost".
export function payWith(rounds: number[], owned: Pick[], picks: Values["picks"]): Payment {
  const used = new Set<Pick>();
  const out: Payment = { picks: [], missing: [], value: 0 };
  for (const round of rounds) {
    const pick = owned
      .filter((p) => !used.has(p) && p.round <= round)
      .sort((a, b) => b.round - a.round || a.season.localeCompare(b.season))[0];
    if (!pick) {
      out.missing.push(round);
      continue;
    }
    used.add(pick);
    out.picks.push(pick);
    out.value += pickValue(picks, pick.season, pick.round);
  }
  return out;
}

// The price in value terms for anyone: each round owed, from the next draft.
export const listPrice = (rounds: number[], season: string, picks: Values["picks"]) =>
  rounds.reduce((sum, r) => sum + pickValue(picks, season, r), 0);

export const roundsLabel = (rounds: number[]) => rounds.map((r) => ordinal(r)).join(" + ");

export interface TaxiPlayer {
  id: string;
  rosterId: number;
  position: string;
  value: number;
  ppg: number | null;
  // "WR2 on HOU", from Sleeper's depth chart.
  depth: string | null;
}

export type Verdict = "bargain" | "fair" | "overpay";

export interface Assessment {
  // Dynasty value plus this season's scoring, priced like Home's waiver wire: 50 per point a game.
  worth: number;
  price: number;
  ratio: number;
  verdict: Verdict;
}

export function assess(p: TaxiPlayer, price: number): Assessment {
  const worth = Math.round(p.value + POINT_VALUE * (p.ppg ?? 0));
  const ratio = price > 0 ? worth / price : 0;
  return { worth, price, ratio, verdict: ratio >= 1.25 ? "bargain" : ratio >= 0.8 ? "fair" : "overpay" };
}

// Points a game that start in CLT's lineups, where a taxi player has nothing to prove.
const PRODUCING: Record<string, number> = { QB: 14, RB: 7, WR: 7, TE: 5 };

export type Risk = "high" | "medium";

export interface AtRisk {
  player: TaxiPlayer;
  assessment: Assessment;
  risk: Risk;
  reason: string;
}

const times = (ratio: number) => (ratio >= 1.95 ? `~${Math.round(ratio)}x` : `${ratio.toFixed(1)}x`);

// Why a manager would pay: depth chart, scoring, and value against the price.
export function stealCase(p: TaxiPlayer, a: Assessment, rounds: number[]): string {
  const parts = [p.depth, p.ppg !== null && p.ppg > 0 ? `${p.ppg.toFixed(1)} ppg` : null, `worth ${times(a.ratio)} a ${roundsLabel(rounds)}`];
  return parts.filter(Boolean).join(", ");
}

// My taxi players a rival would pay the price for: worth about the price or
// more, or already scoring like a starter. Riskiest first.
export function atRisk(list: { player: TaxiPlayer; assessment: Assessment; rounds: number[] }[]): AtRisk[] {
  return list
    .flatMap(({ player, assessment, rounds }) => {
      const producing = (player.ppg ?? 0) >= (PRODUCING[player.position] ?? Infinity);
      const risk: Risk | null = assessment.ratio >= 1 ? "high" : assessment.ratio >= 0.75 || producing ? "medium" : null;
      return risk ? [{ player, assessment, risk, reason: stealCase(player, assessment, rounds) }] : [];
    })
    .sort((a, b) => Number(b.risk === "high") - Number(a.risk === "high") || b.assessment.ratio - a.assessment.ratio);
}

// Other teams' taxi players worth clearly more than what I'd pay, biggest surplus first.
export function stealTargets<T extends { player: TaxiPlayer; assessment: Assessment }>(list: T[]): T[] {
  return list
    .filter((t) => t.assessment.verdict === "bargain")
    .sort((a, b) => b.assessment.worth - b.assessment.price - (a.assessment.worth - a.assessment.price));
}
