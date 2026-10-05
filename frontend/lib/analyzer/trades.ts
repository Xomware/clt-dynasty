import { type PlayerMap, playerName } from "@/lib/players";
import type { SleeperRoster } from "@/lib/sleeper/league";
import { type Axis, leagueShape, standing, type TeamAnalysis } from "./analysis";
import { valueOf, type Values } from "./values";

// Values within 5% of each other make a fair one-for-one.
export const FAIR = 0.05;

const POSITIONS: Axis[] = ["QB", "RB", "WR", "TE"];

export interface TradePlayer {
  id: string;
  name: string;
  position: string;
  value: number;
}

export interface Recommendation {
  partner: TeamAnalysis;
  give: TradePlayer;
  receive: TradePlayer;
  // How far the trade lifts the weak position, capped at its gap to the league average.
  improvement: number;
  gap: number;
}

// Ported from the Angular RecommendedTradeService (iOS RecommendedTradeBuilder):
// for each partner strong where I'm weak, offer my best-valued surplus player
// within 5% of their best player at my weak spot. The whole roster counts,
// taxi and IR included, as it did there.
export function recommendTrades(
  me: TeamAnalysis,
  teams: TeamAnalysis[],
  rosters: SleeperRoster[],
  players: PlayerMap,
  values: Values,
  limit = 5,
) {
  const { average } = leagueShape(teams);
  const weak = POSITIONS.filter((p) => standing(me.axes[p], average[p]) === "below");
  const strong = POSITIONS.filter((p) => standing(me.axes[p], average[p]) === "above");
  if (weak.length === 0 || strong.length === 0) return { weak, strong, trades: [] };

  const at = (position: string, roster: SleeperRoster | undefined): TradePlayer[] =>
    (roster?.players ?? []).flatMap((id) => {
      const value = valueOf(values, id);
      const pos = players[id]?.position ?? values.players.get(id)?.position ?? "";
      return value > 0 && pos.toUpperCase() === position ? [{ id, name: playerName(players[id], id), position: pos, value }] : [];
    });
  const roster = (id: number) => rosters.find((r) => r.roster_id === id);
  const gapOf = (a: number, b: number) => Math.abs(a - b) / Math.max(a, b);

  const trades: Recommendation[] = [];
  const seen = new Set<string>();
  for (const partner of teams) {
    if (partner.rosterId === me.rosterId) continue;
    for (const need of weak) {
      if (standing(partner.axes[need], average[need]) !== "above") continue;
      const receive = at(need, roster(partner.rosterId)).sort((a, b) => b.value - a.value)[0];
      if (!receive) continue;
      for (const spare of strong) {
        const give = at(spare, roster(me.rosterId))
          .sort((a, b) => b.value - a.value)
          .find((p) => gapOf(p.value, receive.value) <= FAIR);
        const key = give && `${partner.rosterId}:${give.id}:${receive.id}`;
        if (!give || !key || seen.has(key)) continue;
        seen.add(key);
        trades.push({
          partner,
          give,
          receive,
          improvement: Math.min(receive.value, Math.max(0, average[need] - me.axes[need])),
          gap: gapOf(give.value, receive.value),
        });
      }
    }
  }
  return { weak, strong, trades: trades.sort((a, b) => b.improvement - a.improvement).slice(0, limit) };
}
