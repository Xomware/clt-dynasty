import { describe, expect, it } from "vitest";

import type { SleeperRoster } from "@/lib/sleeper/types";
import { analyze } from "./analysis";
import { recommendTrades } from "./trades";
import { parseValues } from "./values";

// Roster 1 is deep at WR and thin at RB; roster 2 the reverse.
const v = (id: string, position: string, value: number) => ({ player: { sleeperId: id, position, name: id }, value });
const values = parseValues([
  v("wr1", "WR", 9000), v("wr2", "WR", 4000), v("rb1", "RB", 1000),
  v("rb2", "RB", 8800), v("rb3", "RB", 3000), v("wr3", "WR", 1000),
  v("rb4", "RB", 4000), v("wr4", "WR", 4000),
  v("qb1", "QB", 5000), v("qb2", "QB", 5000), v("qb3", "QB", 5000),
]);

const roster = (roster_id: number, players: string[]): SleeperRoster => ({
  roster_id,
  owner_id: `u${roster_id}`,
  co_owners: null,
  starters: players,
  players,
  taxi: null,
  reserve: null,
  settings: { wins: 0, losses: 0, ties: 0, fpts: 0 },
  metadata: null,
});

const rosters = [roster(1, ["qb1", "wr1", "wr2", "rb1"]), roster(2, ["qb2", "rb2", "rb3", "wr3"]), roster(3, ["qb3", "rb4", "wr4"])];
const teams = rosters.map((r) => analyze(r, [], {}, values));

describe("recommended trades", () => {
  it("offers my surplus WR for a partner's best RB when the values are within 5%", () => {
    const { weak, strong, trades } = recommendTrades(teams[0], teams, rosters, {}, values);
    expect(weak).toEqual(["RB"]);
    expect(strong).toEqual(["WR"]);
    expect(trades).toHaveLength(1);
    const [t] = trades;
    expect([t.partner.rosterId, t.give.id, t.receive.id]).toEqual([2, "wr1", "rb2"]);
    // RB average is 5600 and I have 1000, so the 8800 RB's lift is capped at the 4600 gap.
    expect(t.improvement).toBe(4600);
    expect(t.gap).toBeCloseTo(200 / 9000);
  });

  it("finds nothing for a team with no hole, and nothing when no value is close enough", () => {
    expect(recommendTrades(teams[0], [teams[0]], rosters, {}, values).weak).toEqual([]);
    const far = parseValues([...rosters.flatMap((r) => r.players ?? []).map((id) => v(id, id.slice(0, 2).toUpperCase(), values.players.get(id)!.value)), v("rb2", "RB", 7000)]);
    const farTeams = rosters.map((r) => analyze(r, [], {}, far));
    expect(recommendTrades(farTeams[0], farTeams, rosters, {}, far).trades).toEqual([]);
  });

  it("keeps only the biggest lifts when Home asks for its top few", () => {
    const deep = parseValues([...rosters.flatMap((r) => r.players ?? []).map((id) => v(id, id.slice(0, 2).toUpperCase(), values.players.get(id)!.value)), v("rb5", "RB", 8700)]);
    const four = [...rosters, roster(4, ["qb3", "rb5"])];
    const teams4 = four.map((r) => analyze(r, [], {}, deep));
    const all = recommendTrades(teams4[0], teams4, four, {}, deep).trades;
    expect(all.map((t) => t.partner.rosterId).sort()).toEqual([2, 4]);
    expect(recommendTrades(teams4[0], teams4, four, {}, deep, 1).trades).toEqual(all.slice(0, 1));
  });
});
