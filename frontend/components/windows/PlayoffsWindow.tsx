"use client";

import { type CSSProperties, type MouseEvent, useEffect, useId, useRef, useState } from "react";

import { MatchupCard } from "@/components/views/matchup-card";
import { TrophyIcon } from "@/components/xp/icons";
import { TeamLink } from "@/components/xp/TeamLink";
import {
  type Bracket,
  bracketColumns,
  type Cell,
  finishOrder,
  fromSleeper,
  lastFinishedWeek,
  type Match,
  projectedBracket,
  type Slot,
} from "@/lib/league/brackets";
import { leagueMatchups, rosters, users, winnersBracket } from "@/lib/league/cache";
import { leagueChain } from "@/lib/league/history";
import { playoffSeeds, type Standing, sortStandings } from "@/lib/league/standings";
import { type Team, teamOf, useLeague } from "@/lib/league/use-league";
import { startingSlots, weekGames } from "@/lib/league/use-week-games";
import type { SleeperLeague, SleeperMatchup, SleeperNflState, SleeperRoster, SleeperUser } from "@/lib/sleeper/types";
import { useLoad } from "@/lib/use-load";

import "./league.css";
import "./playoffs.css";

const PLACES = ["Champion", "Runner-up", "3rd", "4th", "5th", "6th"];
// Indexed from the final back, so a longer bracket still names its last rounds right.
const ROUNDS = ["Championship", "Semifinals", "Wild Card"];
const GAMES = ["Championship", "Semifinal", "Wild card"];

interface SeasonBracket {
  league: SleeperLeague;
  users: SleeperUser[];
  rosters: SleeperRoster[];
  standings: Standing[];
  seeds: number[];
  bracket: Bracket;
  // Sleeper hasn't drawn it yet, so this is today's standings seeded by the rulebook.
  projected: boolean;
  finished: number;
  // Rows for each playoff week that has started.
  weeks: Map<number, SleeperMatchup[]>;
}

async function loadSeason(l: SleeperLeague, nfl: SleeperNflState): Promise<SeasonBracket> {
  const id = l.league_id;
  const start = l.settings.playoff_week_start;
  const finished = lastFinishedWeek(nfl, l.season);
  const inSeason = l.status === "in_season";
  const projected = inSeason && finished < start - 1;
  const current = l.status === "complete" ? Infinity : nfl.season === l.season ? nfl.week : 0;
  const weeks = projected ? [] : [start, start + 1, start + 2].filter((w) => w <= current);
  const [u, r, drawn, rows] = await Promise.all([
    users(id),
    rosters(id),
    projected ? Promise.resolve([]) : winnersBracket(inSeason, id),
    Promise.all(weeks.map((w) => leagueMatchups(w, w > finished, false, id))),
  ]);
  const standings = sortStandings(r);
  const seeds = playoffSeeds(standings);
  return {
    league: l,
    users: u,
    rosters: r,
    standings,
    seeds,
    bracket: projected ? projectedBracket(seeds) : fromSleeper(drawn, seeds),
    projected,
    finished,
    weeks: new Map(weeks.map((w, i) => [w, rows[i]])),
  };
}

const record = (s: Standing | undefined) => (s ? `${s.wins}-${s.losses}${s.ties ? `-${s.ties}` : ""}` : "");

interface View {
  season: SeasonBracket;
  teamFor: (rosterId: number) => Team;
  myRosterId: number | null;
  roundName: (round: number) => string;
  points: (match: Match, rosterId: number | null) => number | undefined;
  openLineups: (match: Match, opener: HTMLElement) => void;
}

function tbdLabel(slot: Slot, season: SeasonBracket, view: View): string {
  const feeder = season.bracket.rounds.flat().find((m) => m.id === slot.feeder);
  if (!feeder) return "TBD";
  if (feeder.round === 1 && feeder.a.seed && feeder.b.seed) {
    const [hi, lo] = [feeder.a.seed, feeder.b.seed].sort((x, y) => x - y);
    return `Winner of ${hi} v ${lo}`;
  }
  return `${GAMES[season.bracket.rounds.length - feeder.round] ?? view.roundName(feeder.round)} winner`;
}

interface SlotRowProps {
  slot: Slot;
  match: Match | null;
  view: View;
}

function SlotRow({ slot, match, view }: SlotRowProps) {
  const { season, teamFor, myRosterId } = view;
  const id = slot.rosterId;
  const won = id !== null && match?.winner === id;
  const lost = id !== null && match?.loser === id;
  const points = match ? view.points(match, id) : undefined;
  const team = id === null ? null : teamFor(id);
  return (
    <div className="pb-slot" data-result={won ? "won" : lost ? "lost" : undefined}>
      <span className="pb-seed">
        <span className="sr-only">Seed </span>
        {slot.seed ?? ""}
      </span>
      {team && id !== null ? (
        <TeamLink leagueId={season.league.league_id} rosterId={id} name={team.name} avatarUrl={team.avatarUrl} isMine={id === myRosterId} />
      ) : (
        <span className="pb-tbd">{tbdLabel(slot, season, view)}</span>
      )}
      {won && <span className="sr-only">, won</span>}
      {lost && <span className="sr-only">, out</span>}
      {!match ? (
        <span className="xp-tag pb-end">Bye</span>
      ) : points !== undefined ? (
        <button
          type="button"
          className="pb-score pb-end"
          aria-label={`${points.toFixed(2)} points, show the ${view.roundName(match.round)} lineups`}
          onClick={(e: MouseEvent<HTMLButtonElement>) => view.openLineups(match, e.currentTarget)}
        >
          {points.toFixed(2)}
        </button>
      ) : season.projected && id !== null ? (
        <span className="pb-record pb-end">{record(season.standings.find((s) => s.rosterId === id))}</span>
      ) : null}
    </div>
  );
}

function Champion({ match, view }: { match: Match; view: View }) {
  const { season, teamFor, myRosterId } = view;
  const id = match.winner;
  const team = id === null ? null : teamFor(id);
  return (
    <div className="pb-champ" data-crowned={id !== null || undefined}>
      <TrophyIcon width={36} height={36} className="pb-trophy" />
      <div className="min-w-0">
        <p className="pb-champ-label">{season.league.season} Champion</p>
        {team && id !== null ? (
          <TeamLink leagueId={season.league.league_id} rosterId={id} name={team.name} avatarUrl={team.avatarUrl} isMine={id === myRosterId} />
        ) : (
          <p className="pb-tbd">Crowned week {season.league.settings.playoff_week_start + 2}</p>
        )}
      </div>
    </div>
  );
}

interface CellViewProps {
  cell: Cell;
  col: number;
  last: boolean;
  view: View;
}

// Connector lines are drawn in the column gap: a stub out of every cell but
// the final, and on each later game an elbow joining its two feeders' stubs.
// A line lights up once a team has really advanced along it.
function CellView({ cell, col, last, view }: CellViewProps) {
  const real = !view.season.projected;
  const style = { gridRow: `${cell.rows[0] + 2} / ${cell.rows[1] + 2}`, "--col": col } as CSSProperties;
  if (cell.kind === "bye") {
    return (
      <div className="pb-cell" style={style}>
        <span className="pb-line pb-out" data-on={(real && cell.slot.rosterId !== null) || undefined} />
        <div className="pb-match pb-bye" role="group" aria-label={`Bye: seed ${cell.slot.seed}`}>
          <SlotRow slot={cell.slot} match={null} view={view} />
        </div>
      </div>
    );
  }
  const { match, joins } = cell;
  const [top, bottom] = [match.a.rosterId !== null && real, match.b.rosterId !== null && real];
  if (joins) Object.assign(style, { "--jt": `${joins[0] * 100}%`, "--jb": `${joins[1] * 100}%` });
  const card = (
    <div className="pb-match" role="group" aria-label={`${view.roundName(match.round)}, game ${match.id}`}>
      <SlotRow slot={match.a} match={match} view={view} />
      <SlotRow slot={match.b} match={match} view={view} />
    </div>
  );
  return (
    <div className={`pb-cell${last ? " pb-final" : ""}`} style={style}>
      {!last && <span className="pb-line pb-out" data-on={match.winner !== null || undefined} />}
      {joins && (
        <>
          <span className="pb-line pb-in-top" data-on={top || undefined} />
          <span className="pb-line pb-in-bottom" data-on={bottom || undefined} />
          <span className="pb-line pb-in" data-on={top || bottom || undefined} />
        </>
      )}
      {last ? (
        <>
          <div className="pb-crown">
            <Champion match={match} view={view} />
            <span className="pb-line pb-up" data-on={match.winner !== null || undefined} />
          </div>
          {card}
        </>
      ) : (
        card
      )}
    </div>
  );
}

function BracketView({ view }: { view: View }) {
  const { season } = view;
  const columns = bracketColumns(season.bracket);
  const rows = Math.max(...columns[0].map((c) => c.rows[1]));
  const start = season.league.settings.playoff_week_start;
  const heading = useId();
  return (
    <div className="pb-scroll" role="group" aria-label={`${season.league.season} playoff bracket`}>
      <div className="pb-grid" style={{ "--cols": columns.length, "--rows": rows } as CSSProperties}>
        {columns.map((cells, i) => (
          <section key={i} className="pb-round" style={{ gridColumn: i + 1 }} aria-labelledby={`${heading}-${i}`}>
            <h3 id={`${heading}-${i}`} className="pb-round-title">
              {view.roundName(i + 1)} <span className="pb-week">Week {start + i}</span>
            </h3>
            {cells.map((cell) => (
              <CellView
                key={cell.kind === "game" ? cell.match.id : `bye-${cell.slot.seed}`}
                cell={cell}
                col={i}
                last={i === columns.length - 1}
                view={view}
              />
            ))}
          </section>
        ))}
      </div>
    </div>
  );
}

interface LineupsProps {
  match: Match;
  view: View;
  onClose: () => void;
}

function Lineups({ match, view, onClose }: LineupsProps) {
  const { season } = view;
  const ref = useRef<HTMLElement>(null);
  const heading = useId();
  const week = season.league.settings.playoff_week_start + match.round - 1;
  const ids = [match.a.rosterId, match.b.rosterId];
  const game = weekGames(season.weeks.get(week) ?? [], startingSlots(season.league.roster_positions)).find((g) =>
    g.sides.every((s) => ids.includes(s.rosterId)),
  );

  useEffect(() => {
    ref.current?.scrollIntoView({ block: "start" });
    ref.current?.focus({ preventScroll: true });
  }, [match]);

  return (
    <section ref={ref} tabIndex={-1} className="xp-group pb-lineups" aria-labelledby={heading}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 id={heading} className="xp-group-title mb-0">
          {view.roundName(match.round)} lineups <span className="font-normal">Week {week}</span>
        </h3>
        <button type="button" className="xp-button" onClick={onClose}>
          Close
        </button>
      </div>
      {game ? (
        <MatchupCard
          key={`${week}-${game.id}`}
          game={game}
          leagueId={season.league.league_id}
          teamFor={view.teamFor}
          myRosterId={view.myRosterId}
          defaultOpen
        />
      ) : (
        <p>Sleeper has no lineups for this game.</p>
      )}
    </section>
  );
}

function SeasonView({ season, myRosterId }: { season: SeasonBracket; myRosterId: number | null }) {
  const [open, setOpen] = useState<{ match: Match; opener: HTMLElement } | null>(null);
  const { league } = season;
  const start = league.settings.playoff_week_start;
  const count = season.bracket.rounds.length;

  if (season.projected && season.finished < 1)
    return <p>The {league.season} projection starts once week 1 is final.</p>;
  if (count === 0) return <p>Sleeper hasn&rsquo;t drawn the {league.season} bracket yet.</p>;

  const view: View = {
    season,
    teamFor: (id) => teamOf(season.users, season.rosters.find((r) => r.roster_id === id), id),
    myRosterId,
    roundName: (round) => ROUNDS[count - round] ?? `Round ${round}`,
    points: (match, id) => {
      if (id === null || match.a.rosterId === null || match.b.rosterId === null) return undefined;
      return season.weeks.get(start + match.round - 1)?.find((r) => r.roster_id === id)?.points;
    },
    openLineups: (match, opener) => setOpen({ match, opener }),
  };
  const finish = finishOrder(season.bracket, season.seeds);
  const close = () => {
    open?.opener.focus();
    setOpen(null);
  };

  return (
    <>
      {season.projected && (
        <p className="pb-banner">
          <span className="xp-tag">Projected</span>
          <span>
            If the season ended today, after week {season.finished}. Division winners take seeds 1 to 3; the bracket
            locks once week {start - 1} ends.
          </span>
        </p>
      )}
      <BracketView key={league.league_id} view={view} />
      {open && <Lineups match={open.match} view={view} onClose={close} />}
      {finish && (
        <section className="xp-group" aria-labelledby="playoffs-finish">
          <h3 id="playoffs-finish" className="xp-group-title">
            Final standings
          </h3>
          <ol className="flex flex-col gap-1">
            {finish.map((id, i) => {
              const team = view.teamFor(id);
              return (
                <li key={id} className="flex items-center gap-2">
                  <span className="w-20 flex-none font-bold">{PLACES[i] ?? `${i + 1}th`}</span>
                  <TeamLink leagueId={league.league_id} rosterId={id} name={team.name} avatarUrl={team.avatarUrl} isMine={id === myRosterId} />
                </li>
              );
            })}
          </ol>
          <p className="mt-2 text-xs">No consolation games: knocked-out teams rank by seed within their round.</p>
        </section>
      )}
    </>
  );
}

export function PlayoffsWindow() {
  const { data, error: leagueError, myRosterId } = useLeague();
  const picker = useId();
  const [pick, setPick] = useState<string | null>(null);
  const [chain] = useLoad(leagueChain, "chain");
  const leagues = chain.status === "ok" ? chain.value.filter((l) => l.status !== "pre_draft" && l.status !== "drafting") : [];
  const chosen = leagues.find((l) => l.league_id === pick) ?? leagues[0];
  const nfl = data?.nfl;
  const [season] = useLoad(
    () => (chosen && nfl ? loadSeason(chosen, nfl) : new Promise<never>(() => {})),
    `${chosen?.league_id}:${nfl?.season}:${nfl?.week}:${nfl?.season_type}`,
  );

  const failed = leagueError ?? (chain.status === "error" ? chain.message : season.status === "error" ? season.message : null);
  if (failed) return <p role="alert">Couldn&rsquo;t reach Sleeper ({failed}). Close Playoffs and open it again to retry.</p>;
  if (chain.status === "ok" && !chosen) return <p>No season has drafted yet, so there is no bracket.</p>;
  if (!chosen) return <p role="status">Loading the bracket...</p>;

  return (
    <div className="grid grid-cols-1 gap-3">
      <div className="flex items-center gap-2">
        <label htmlFor={picker} className="font-bold">
          Season
        </label>
        <select id={picker} className="xp-select" value={chosen.league_id} onChange={(e) => setPick(e.target.value)}>
          {leagues.map((l) => (
            <option key={l.league_id} value={l.league_id}>
              {l.season}
            </option>
          ))}
        </select>
      </div>
      {season.status === "ok" && season.value.league.league_id === chosen.league_id ? (
        <SeasonView key={chosen.league_id} season={season.value} myRosterId={myRosterId} />
      ) : (
        <p role="status">Loading the {chosen.season} bracket...</p>
      )}
    </div>
  );
}
