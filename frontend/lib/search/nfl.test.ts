import { describe, expect, it } from "vitest";

import type { Player } from "@/lib/api/players";
import { searchNflTeams, searchPlayers } from "./nfl";

const p = (player_id: string, first_name: string, last_name: string, team: string | undefined, search_rank: number, position = "WR"): Player => ({
  player_id,
  first_name,
  last_name,
  team,
  search_rank,
  position,
});

// Real names and 2026 search ranks.
const PLAYERS = Object.fromEntries(
  [
    p("7564", "Ja'Marr", "Chase", "CIN", 4),
    p("7547", "Amon-Ra", "St. Brown", "DET", 9),
    p("4984", "Josh", "Allen", "BUF", 3, "QB"),
    p("5848", "Keenan", "Allen", "LAC", 210),
    p("4993", "Allen", "Lazard", undefined, 900),
    p("4981", "Mike", "Williams", undefined, 800),
    p("11592", "Mike", "Williams", "NYJ", 1200),
    p("6904", "Jalen", "Hurts", "PHI", 6, "QB"),
    p("PHI", "Philadelphia", "Eagles", "PHI", 1, "DEF"),
    p("9509", "Bijan", "Robinson", "ATL", 1, "RB"),
  ].map((x) => [x.player_id, x]),
);

const ids = (query: string, limit = 10) => searchPlayers(PLAYERS, query, limit).map((h) => h.item.player_id);

describe("NFL player search", () => {
  it("matches the start of each name word, ignoring apostrophes, periods and case", () => {
    expect(ids("ja chase")).toEqual(["7564"]);
    expect(ids("JAMARR")).toEqual(["7564"]);
    expect(ids("Ja’Marr")).toEqual(["7564"]);
    expect(ids("st brown")).toEqual(["7547"]);
    expect(ids("amon ra")).toEqual(["7547"]);
  });

  it("falls back to a match inside the run-together name", () => {
    expect(ids("stbrown")).toEqual(["7547"]);
    expect(ids("ijan")).toEqual(["9509"]);
  });

  it("needs every word to match", () => {
    expect(ids("josh chase")).toEqual([]);
    expect(ids("   ")).toEqual([]);
  });

  it("ranks a whole-word match above a prefix, then a rostered player, then by search rank", () => {
    // Allen is a whole last name for two and a whole first name for one; "Al" would only be a prefix.
    expect(ids("allen")).toEqual(["4984", "5848", "4993"]);
    // Same name: the one on an NFL team first, though his search rank is worse.
    expect(ids("mike williams")).toEqual(["11592", "4981"]);
  });

  it("puts an exact full name above a partial one", () => {
    const [top, next] = searchPlayers(PLAYERS, "josh allen", 5);
    expect(top.item.player_id).toBe("4984");
    expect(next).toBeUndefined();
    expect(top.score).toBeGreaterThan(searchPlayers(PLAYERS, "josh all", 5)[0].score);
  });

  it("leaves defenses to the team search and stops at the limit", () => {
    expect(ids("eagles")).toEqual([]);
    expect(ids("a", 2)).toHaveLength(2);
  });
});

describe("NFL team search", () => {
  const abbrs = (q: string) => searchNflTeams(q).map((h) => h.item.abbr);

  it("finds a team by code, city, name or nickname", () => {
    expect(abbrs("LAC")[0]).toBe("LAC");
    expect(abbrs("chargers")).toEqual(["LAC"]);
    expect(abbrs("bolts")).toEqual(["LAC"]);
    expect(abbrs("niners")).toEqual(["SF"]);
    expect(abbrs("green bay")).toEqual(["GB"]);
    expect(abbrs("new york").sort()).toEqual(["NYG", "NYJ"]);
    expect(abbrs("los angeles r")).toEqual(["LAR"]);
  });

  it("ranks the exact code above teams that only start with it", () => {
    const ne = abbrs("ne");
    expect(ne[0]).toBe("NE");
    expect(ne).toContain("NO");
  });
});
