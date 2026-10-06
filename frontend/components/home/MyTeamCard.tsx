"use client";

import { DrillLink } from "@/components/xp/DrillLink";
import { TeamLink } from "@/components/xp/TeamLink";
import { TeamName } from "@/components/xp/TeamName";
import { LEAGUE_ID } from "@/lib/config";
import { leagueMatchups } from "@/lib/league/cache";
import { divisionName, playoffSeeds, sortStandings } from "@/lib/league/standings";
import type { LeagueData, Team } from "@/lib/league/use-league";
import { type Game, weekGames, startingSlots } from "@/lib/league/use-week-games";
import { teamLink } from "@/lib/team/links";
import { useLoad } from "@/lib/use-load";
import { HomeCard } from "./HomeCard";

const ordinal = (n: number) => {
  const tail = n % 100 >= 11 && n % 100 <= 13 ? "th" : (["th", "st", "nd", "rd"][n % 10] ?? "th");
  return `${n}${tail}`;
};

interface MyTeamCardProps {
  data: LeagueData | null;
  games: Game[] | null;
  week: number | undefined;
  live: boolean;
  teamFor: (rosterId: number) => Team;
  myRosterId: number | null;
  memberLoading: boolean;
}

export function MyTeamCard({ data, games, week, live, teamFor, myRosterId, memberLoading }: MyTeamCardProps) {
  const more = myRosterId !== null ? { to: { kind: "my-team" as const, params: {} }, label: "My Team" } : undefined;
  return (
    <HomeCard title="Your team" more={more} className="home-mine">
      {!data || memberLoading ? (
        <p role="status">Loading your team...</p>
      ) : myRosterId === null ? (
        <p>
          Your Sleeper account isn&rsquo;t linked to a CLT roster yet.{" "}
          <DrillLink to={{ kind: "settings", params: {} }} className="home-more">
            Link it in Settings
          </DrillLink>
        </p>
      ) : (
        <Mine data={data} games={games} week={week} live={live} teamFor={teamFor} rosterId={myRosterId} />
      )}
    </HomeCard>
  );
}

interface MineProps {
  data: LeagueData;
  games: Game[] | null;
  week: number | undefined;
  live: boolean;
  teamFor: (rosterId: number) => Team;
  rosterId: number;
}

function Mine({ data, games, week, live, teamFor, rosterId }: MineProps) {
  const standings = sortStandings(data.rosters);
  const at = standings.findIndex((s) => s.rosterId === rosterId);
  const me = standings[at];
  const seed = playoffSeeds(standings).indexOf(rosterId) + 1;
  const team = teamFor(rosterId);
  const started = data.league.status === "in_season" || data.league.status === "complete";
  const inPlayoffs = seed > 0 && seed <= data.league.settings.playoff_teams;
  const game = games?.find((g) => g.sides.some((s) => s.rosterId === rosterId));

  return (
    <div className="home-mine-body">
      <div className="home-mine-team">
        <DrillLink to={teamLink(LEAGUE_ID, rosterId)}>
          <TeamName name={team.name} avatarUrl={team.avatarUrl} />
        </DrillLink>
        {me && started && (
          <p className="text-xs">
            {divisionName(data.league, me.division)}, {inPlayoffs ? `seed ${seed} if the season ended today` : "outside the playoff seeds"}
          </p>
        )}
      </div>
      {me && started && (
        <dl className="home-stats">
          <div>
            <dt>Rank</dt>
            <dd>
              {ordinal(at + 1)} <span className="home-big-label">of {standings.length}</span>
            </dd>
          </div>
          <div>
            <dt>Record</dt>
            <dd>
              {me.wins}-{me.losses}
              {me.ties > 0 && `-${me.ties}`}
            </dd>
          </div>
          <div>
            <dt>Points for</dt>
            <dd>{me.pf.toFixed(2)}</dd>
          </div>
          <div>
            <dt>Streak</dt>
            <dd>{me.streak || "-"}</dd>
          </div>
        </dl>
      )}
      {week !== undefined && game && <ThisGame game={game} week={week} live={live} teamFor={teamFor} rosterId={rosterId} />}
      {week !== undefined && data.league.status === "in_season" && (
        <NextGame data={data} week={week + 1} teamFor={teamFor} rosterId={rosterId} />
      )}
    </div>
  );
}

interface GameProps {
  game: Game;
  week: number;
  live: boolean;
  teamFor: (rosterId: number) => Team;
  rosterId: number;
}

function ThisGame({ game, week, live, teamFor, rosterId }: GameProps) {
  const mine = game.sides.find((s) => s.rosterId === rosterId);
  const them = game.sides.find((s) => s.rosterId !== rosterId);
  if (!mine || !them) return null;
  const scored = mine.points > 0 || them.points > 0;
  const lead = mine.points - them.points;
  return (
    <div className="home-mine-game">
      <p className="flex flex-wrap items-center gap-2 text-xs">
        <span className="font-bold">Week {week}</span>
        {live && scored && <span className="xp-tag home-live">Live</span>}
      </p>
      <p className="home-mine-score">
        <span className="tabular-nums">{scored ? mine.points.toFixed(2) : "-"}</span>
        <span className="text-xs">vs</span>
        <span className="tabular-nums">{scored ? them.points.toFixed(2) : "-"}</span>
      </p>
      <p className="flex flex-wrap items-center gap-x-1">
        <TeamLink rosterId={them.rosterId} {...teamFor(them.rosterId)} />
        {scored && <span className="text-xs">{lead === 0 ? "level" : lead > 0 ? `you lead by ${lead.toFixed(2)}` : `you trail by ${(-lead).toFixed(2)}`}</span>}
      </p>
    </div>
  );
}

interface NextProps {
  data: LeagueData;
  week: number;
  teamFor: (rosterId: number) => Team;
  rosterId: number;
}

// Sleeper schedules every regular-season week up front, so next week's opponent is already known.
// Cached as live: this entry is what Scores reads once that week starts.
function NextGame({ data, week, teamFor, rosterId }: NextProps) {
  const regular = week < data.league.settings.playoff_week_start;
  const [load] = useLoad(() => (regular ? leagueMatchups(week, true) : Promise.resolve([])), `next/${week}`);
  if (load.status !== "ok") return null;
  const game = weekGames(load.value, startingSlots(data.league.roster_positions)).find((g) => g.sides.some((s) => s.rosterId === rosterId));
  const them = game?.sides.find((s) => s.rosterId !== rosterId);
  if (!them) return null;
  return (
    <div className="home-mine-next">
      <p className="text-xs font-bold">Next, Week {week}</p>
      <TeamLink rosterId={them.rosterId} {...teamFor(them.rosterId)} />
    </div>
  );
}
