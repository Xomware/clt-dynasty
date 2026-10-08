"use client";

import { LoadError } from "@/components/xp/LoadError";
import { NflTeamLink } from "@/components/xp/NflTeamLink";
import { PlayerFace } from "@/components/xp/PlayerFace";
import { PlayerRankChips } from "@/components/xp/RankChips";
import { TeamLink } from "@/components/xp/TeamLink";
import { LEAGUE_ID } from "@/lib/config";
import type { WindowParams } from "@/lib/desktop/windows";
import { leagueMatchups, nflSchedule, nflState, player as getPlayer, playerStats } from "@/lib/league/cache";
import { defaultWeek, leagueWeek } from "@/lib/league/default-week";
import { teamOf } from "@/lib/league/use-league";
import { byeWeek, type FantasyWeek, fantasyWeek, heightLabel, type NflGame, nflGame, rosterSpot, statLine } from "@/lib/player/season";
import { rosterOf } from "@/lib/sleeper/rosters";
import type { SleeperGame, SleeperPlayer, SleeperWeekStats } from "@/lib/sleeper/types";
import { type LeagueData, loadLeagueData, useMySleeperId } from "@/lib/team/data";
import { injuryTag } from "@/lib/team/team";
import { useLoad } from "@/lib/use-load";

import "./player.css";

const ID = /^(\d+|[A-Z]{2,3})$/;
// `?open=player:4984`; a defense is its team code, `player:LAC`.
export const readPlayerLink = (value: string) => (ID.test(value) ? { playerId: value } : null);

export const playerTitle = (p: SleeperPlayer | null | undefined) => (p ? `${p.first_name} ${p.last_name}` : "Player");

export interface Week {
  week: number;
  fantasy: FantasyWeek | null;
  game: NflGame | null;
  stats: SleeperWeekStats | null;
}

export interface Page {
  player: SleeperPlayer;
  data: LeagueData;
  weeks: Week[];
  // Why Sleeper's stats or schedule didn't load; the fantasy points still show.
  nflError: string | null;
  bye: number | null;
}

export async function loadPage(id: string): Promise<Page | null> {
  const [player, data, nfl] = await Promise.all([getPlayer(id), loadLeagueData(LEAGUE_ID), nflState()]);
  if (!player) return null;
  const { league } = data;
  const last = leagueWeek(league, nfl);
  const weekNumbers = Array.from({ length: last }, (_, i) => i + 1);
  const live = (w: number) => league.status === "in_season" && w >= nfl.week;
  const [matchups, stats, schedule] = await Promise.all([
    Promise.all(weekNumbers.map((w) => leagueMatchups(w, live(w)))),
    playerStats(id, league.season).catch((e: Error) => e),
    nflSchedule(league.season).catch((e: Error) => e),
  ]);
  // Sleeper moves to next week days early; until somebody scores it isn't worth a row.
  const shown = defaultWeek(last, matchups[last - 1]);
  const games: SleeperGame[] = schedule instanceof Error ? [] : schedule;
  const weeks = weekNumbers.slice(0, shown).map((week): Week => {
    const line = stats instanceof Error ? null : (stats[String(week)] ?? null);
    const team = line?.team ?? player.team;
    return { week, fantasy: fantasyWeek(matchups[week - 1], id), game: team ? nflGame(games, team, week) : null, stats: line };
  });
  const failed = [stats, schedule].find((r) => r instanceof Error);
  return {
    player,
    data,
    weeks,
    nflError: failed instanceof Error ? failed.message : null,
    bye: player.team ? byeWeek(games, player.team) : null,
  };
}

export function PlayerWindow({ params }: { params: WindowParams }) {
  const id = String(params.playerId ?? "");
  const [load, retry] = useLoad(() => loadPage(id), id);

  if (load.status === "loading") return <p role="status">Loading the player from Sleeper...</p>;
  if (load.status === "error") return <LoadError what="the player from Sleeper" message={load.message} onRetry={retry} />;
  if (!load.value) return <p role="alert">Sleeper has no player {id}.</p>;
  const page = load.value;
  return (
    <div className="flex flex-col gap-3">
      <PlayerHead player={page.player} />
      <Bio player={page.player} bye={page.bye} />
      <InClt page={page} />
      <Weeks page={page} />
    </div>
  );
}

function PlayerHead({ player }: { player: SleeperPlayer }) {
  const injury = injuryTag({ player_id: player.player_id, injury_status: player.injury_status ?? undefined });
  const injuryText = [player.injury_status, player.injury_body_part].filter(Boolean).join(", ");
  return (
    <section aria-label={playerTitle(player)} className="team-head">
      <PlayerFace id={player.player_id} position={player.position} size={72} className="player-photo" />
      <div className="team-who">
        <h3 className="team-name">
          <span className="truncate">{playerTitle(player)}</span>
          {injury && (
            <span className="xp-tag team-injury player-injury" title={injuryText}>
              {injury}
              <span className="sr-only">, {injuryText}</span>
            </span>
          )}
        </h3>
        <p className="player-sub">
          {player.number ? <span>#{player.number}</span> : null}
          {player.position && <span className="font-bold">{player.position}</span>}
          {player.team ? <NflTeamLink team={player.team} long /> : <span>Free agent</span>}
        </p>
        <PlayerRankChips id={player.player_id} className="player-ranks" />
      </div>
    </section>
  );
}

function Bio({ player, bye }: { player: SleeperPlayer; bye: number | null }) {
  const exp = player.years_exp === 0 ? "Rookie" : player.years_exp ? `${player.years_exp} yr${player.years_exp === 1 ? "" : "s"}` : null;
  const depth = player.depth_chart_order && player.position ? `${player.position}${player.depth_chart_order}` : null;
  const rows: [string, string | number | null | undefined][] = [
    ["Age", player.age],
    ["Height", player.height ? heightLabel(player.height) : null],
    ["Weight", player.weight ? `${player.weight} lb` : null],
    ["College", player.college],
    ["Experience", exp],
    ["Depth chart", depth],
    ["Bye", bye ? `Week ${bye}` : null],
    ["Status", player.status && player.status !== "Active" ? player.status : null],
  ];
  const shown = rows.filter(([, v]) => v !== null && v !== undefined && v !== "");
  if (shown.length === 0) return null;
  return (
    <dl className="team-stats player-bio" aria-label="Bio">
      {shown.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function InClt({ page }: { page: Page }) {
  const { data, weeks, player } = page;
  const me = useMySleeperId();
  const myRoster = me ? rosterOf(data.rosters, me) : null;
  const spot = rosterSpot(data.rosters, player.player_id);
  const rostered = weeks.filter((w) => w.fantasy);
  const total = rostered.reduce((sum, w) => sum + (w.fantasy?.points ?? 0), 0);
  const started = rostered.filter((w) => w.fantasy?.started).length;
  const team = spot && teamOf(data.users, data.rosters.find((r) => r.roster_id === spot.rosterId), spot.rosterId);

  return (
    <section className="xp-group" aria-label="In the CLT Dynasty League">
      <h3 className="xp-group-title">In the CLT Dynasty League</h3>
      {spot && team ? (
        <p className="player-owner">
          <TeamLink rosterId={spot.rosterId} {...team} isMine={spot.rosterId === myRoster} />
          <span className="xp-tag">{spot.slot}</span>
        </p>
      ) : (
        <p className="player-owner">Free agent: on no CLT roster.</p>
      )}
      {rostered.length > 0 && (
        <dl className="team-stats player-season">
          <div>
            <dt>{data.league.season} points</dt>
            <dd>{total.toFixed(2)}</dd>
          </div>
          <div>
            <dt>Per week</dt>
            <dd>{(total / rostered.length).toFixed(2)}</dd>
          </div>
          <div>
            <dt>Started</dt>
            <dd>
              {started} of {rostered.length}
            </dd>
          </div>
        </dl>
      )}
    </section>
  );
}

export const gameLabel = (g: NflGame | null) => (g === null ? "" : g === "bye" ? "BYE" : `${g.home ? "vs" : "@"} ${g.opponent}`);

export function Weeks({ page }: { page: Page }) {
  const { data, weeks, player, nflError } = page;
  if (weeks.length === 0) return <p className="xp-note">No {data.league.season} games yet.</p>;
  const name = (rosterId: number) => teamOf(data.users, data.rosters.find((r) => r.roster_id === rosterId), rosterId).name;
  const owner = rosterSpot(data.rosters, player.player_id)?.rosterId ?? null;

  return (
    <section className="xp-group" aria-label="Week by week">
      <h3 className="xp-group-title">{data.league.season} week by week</h3>
      {nflError && <p className="xp-note mb-2">Sleeper&rsquo;s NFL stats didn&rsquo;t load ({nflError}), so these are CLT points only.</p>}
      <div className="xp-table-scroll">
        <table className="xp-table player-weeks">
          <caption className="sr-only">
            {playerTitle(player)}, {data.league.season} by week: NFL game, stat line and CLT fantasy points
          </caption>
          <thead>
            <tr>
              <th scope="col" className="w-10">Wk</th>
              <th scope="col" className="w-16">Game</th>
              <th scope="col">Stats</th>
              <th scope="col" className="player-pts-col text-right">
                <abbr title="CLT fantasy points">Pts</abbr>
              </th>
            </tr>
          </thead>
          <tbody>
            {weeks.map((w) => (
              <tr key={w.week}>
                <td className="tabular-nums">{w.week}</td>
                <td className="whitespace-nowrap">{gameLabel(w.game)}</td>
                <td className="player-line">
                  {w.stats ? statLine(player.position, w.stats.stats) : w.game === "bye" || nflError ? "" : "Did not play"}
                  <span className="player-role">
                    {w.fantasy
                      ? `${w.fantasy.started ? "Started" : "Bench"}${w.fantasy.rosterId !== owner ? ` for ${name(w.fantasy.rosterId)}` : ""}${w.fantasy.opponent !== null ? ` vs ${name(w.fantasy.opponent)}` : ""}`
                      : "Not on a CLT roster"}
                  </span>
                </td>
                <td className="text-right font-bold tabular-nums">{w.fantasy ? w.fantasy.points.toFixed(2) : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
