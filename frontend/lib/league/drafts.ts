import { rosterOf } from "@/lib/sleeper/rosters";
import type { SleeperDraft, SleeperDraftPick, SleeperRoster, SleeperTradedPick } from "@/lib/sleeper/types";

export interface Cell {
  round: number;
  slot: number;
  pickNo: number;
  // Who holds the pick: the roster that made it, or for one still to come, the
  // slot's roster after trades. Null when Sleeper has no draft order yet.
  owner: number | null;
  // Set when the original owner traded it away.
  from: number | null;
  pick: SleeperDraftPick | null;
}

// A snake draft runs the slots backwards every other round.
export function pickNumber(draft: SleeperDraft, round: number, slot: number): number {
  const teams = draft.settings.teams;
  const reversed = draft.type === "snake" && round % 2 === 0;
  return (round - 1) * teams + (reversed ? teams + 1 - slot : slot);
}

// Rounds of cells in pick order. The old site took a traded pick's slot from
// its previous owner and ignored the season, so a pick traded twice, or a
// future year's trade, landed on the wrong cell; this uses the original
// owner and the draft's own season.
export function draftBoard(
  draft: SleeperDraft,
  picks: SleeperDraftPick[],
  traded: SleeperTradedPick[],
  rosters: SleeperRoster[],
): Cell[][] {
  const { rounds, teams } = draft.settings;
  const slotRoster = new Map<number, number>();
  for (const [userId, slot] of Object.entries(draft.draft_order ?? {})) {
    const roster = rosterOf(rosters, userId);
    if (roster !== null) slotRoster.set(slot, roster);
  }
  const made = new Map(picks.map((p) => [`${p.round}:${p.draft_slot}`, p]));
  const trades = traded.filter((t) => t.season === draft.season);

  return Array.from({ length: rounds }, (_, r) => {
    const round = r + 1;
    const cells = Array.from({ length: teams }, (_, s): Cell => {
      const slot = s + 1;
      const pick = made.get(`${round}:${slot}`) ?? null;
      const original = slotRoster.get(slot) ?? null;
      const trade = trades.find((t) => t.round === round && t.roster_id === original);
      const owner = pick ? Number(pick.roster_id) : (trade?.owner_id ?? original);
      return { round, slot, pickNo: pickNumber(draft, round, slot), owner, from: owner !== original ? original : null, pick };
    });
    return cells.sort((a, b) => a.pickNo - b.pickNo);
  });
}

// Sleeper keeps one draft per league; a commissioner who remakes it leaves the old one listed.
export const latestDraft = (list: SleeperDraft[]) =>
  [...list].sort((a, b) => (a.start_time ?? 0) - (b.start_time ?? 0)).at(-1) ?? null;

export const pickedName = (p: SleeperDraftPick) =>
  [p.metadata.first_name, p.metadata.last_name].filter(Boolean).join(" ") || p.player_id;
