import type { TaxiRequest } from "@/lib/api/taxi";
import { API_BASE } from "@/lib/config";
import { fixture, stubSleeper } from "./league-mock";

// From the 2026 fixture draft: Love 1.01, Tate 1.02, Mendoza 1.03, Washington 3.27, Raridon 4.44.
// Roster 4 (mine) traded its 2027 3rd away, so a 3rd comes from 2028.
const TAXI: Record<number, string[]> = { 6: ["13287", "13421"], 9: ["13279"], 4: ["13269", "13305"] };
// Sleeper lists taxi players in `players` too.
export const rosters = fixture.rosters.map((r) => ({ ...r, players: [...new Set([...(r.players ?? []), ...(TAXI[r.roster_id] ?? [])])], taxi: TAXI[r.roster_id] ?? null }));

// FantasyCalc's real pick values; player values chosen around them.
const PICKS: [string, number][] = [
  ["2027 1st", 3069],
  ["2027 2nd", 1601],
  ["2027 3rd", 1124],
  ["2027 4th", 852],
  ["2028 1st", 2241],
  ["2028 2nd", 1372],
  ["2028 3rd", 1005],
  ["2028 4th", 803],
];
const VALUES: [string, number][] = [
  ["13287", 6134],
  ["13421", 1500],
  ["13279", 3000],
  ["13269", 3748],
  ["13305", 1700],
];
const FC = [
  ...PICKS.map(([name, value]) => ({ player: { name, position: "PICK" }, value })),
  ...VALUES.map(([sleeperId, value], i) => ({ player: { sleeperId, position: "RB", name: sleeperId }, value, overallRank: 10 + i, trend30Day: 50 })),
];

export const request = (playerId: string, patch: Partial<TaxiRequest> = {}): TaxiRequest => ({
  playerId,
  rosterId: 9,
  requestedBy: "Roster 2",
  isMine: false,
  createdAt: "2026-09-20T12:00:00+00:00",
  ...patch,
});

export const json = (status: number, body: unknown) => () => new Response(JSON.stringify(body), { status });

export const TAXI_ME = {
  member: { email: "member@example.com", displayName: "Roster 4", role: "member", sleeperUserId: "" },
  linkedSleeperUserId: "u4",
  isAdmin: false,
};

// Sleeper's fixture league with taxi squads, roster 4 signed in, FantasyCalc
// values and two steal requests, one on my own player.
export const stubTaxi = (extra: Record<string, unknown> = {}) =>
  stubSleeper({
    [`/league/${fixture.league.league_id}/rosters`]: rosters,
    [`${API_BASE}/clt/me`]: TAXI_ME,
    [`${API_BASE}/clt/taxi-list`]: { leagueId: fixture.league.league_id, requests: [request("13279"), request("13305", { rosterId: 4, requestedBy: "Roster 7" })] },
    "https://api.fantasycalc.com/values/current?isDynasty=true&numQbs=2&numTeams=12&ppr=1": FC,
    ...extra,
  });
