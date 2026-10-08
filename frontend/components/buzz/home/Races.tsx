"use client";

import { type CSSProperties, useId } from "react";

import { HomeCard } from "@/components/home/HomeCard";
import { CountUp } from "@/components/motion/CountUp";
import { DrillLink } from "@/components/xp/DrillLink";
import { LoadError } from "@/components/xp/LoadError";
import { TeamAvatar } from "@/components/xp/TeamAvatar";
import { getWorldCup } from "@/lib/api/clt";
import { LEAGUE_ID } from "@/lib/config";
import { playoffSeeds, sortStandings } from "@/lib/league/standings";
import { type LeagueData, type Team, teamAvatar } from "@/lib/league/use-league";
import { rosterOf } from "@/lib/sleeper/rosters";
import { teamLink } from "@/lib/team/links";
import { useLoad } from "@/lib/use-load";

interface RaceProps {
  data: LeagueData | null;
  teamFor: (rosterId: number) => Team;
  myRosterId: number | null;
}

const bar = (share: number, i: number) => ({ "--share": share, "--i": i }) as CSSProperties;

// The whole league as a race: record order, each bar the team's points for
// against the league's most, the playoff seeds tagged. Points for is the
// standings tiebreaker, so the bars show who wins a tie on record.
export function StandingsRace({ data, teamFor, myRosterId }: RaceProps) {
  const legend = useId();
  const more = { to: { kind: "standings" as const, params: {} }, label: "Standings" };
  if (!data) {
    return (
      <HomeCard title="Standings race" more={more} className="u-race">
        <p role="status">Loading the league...</p>
      </HomeCard>
    );
  }
  if (data.league.status === "pre_draft" || data.league.status === "drafting") {
    return (
      <HomeCard title="Standings race" more={more} className="u-race">
        <p>The race starts once Week 1 kicks off.</p>
      </HomeCard>
    );
  }
  const rows = sortStandings(data.rosters);
  const seeds = playoffSeeds(rows);
  const cut = data.league.settings.playoff_teams;
  const top = Math.max(1, ...rows.map((r) => r.pf));
  return (
    <HomeCard title="Standings race" more={more} className="u-race">
      <p id={legend} className="u-race-legend">
        <span className="u-race-key" aria-hidden>
          <span className="u-race-fill" />
        </span>
        Bars: points for, against the league&rsquo;s most ({top.toFixed(1)}). Points for breaks ties on record.
      </p>
      <ol className="u-race-rows" aria-label="Standings by record" aria-describedby={legend}>
        {rows.map((s, i) => {
          const team = teamFor(s.rosterId);
          const seed = seeds.indexOf(s.rosterId) + 1;
          return (
            <li key={s.rosterId} className="u-race-row" data-mine={s.rosterId === myRosterId || undefined} style={bar(s.pf / top, i)}>
              <span className="u-race-rank">{i + 1}</span>
              <TeamAvatar name={team.name} url={team.avatarUrl} size={32} className="u-race-avatar" />
              <span className="u-race-main">
                <span className="u-race-line">
                  <DrillLink to={teamLink(LEAGUE_ID, s.rosterId)} className="u-race-name">
                    {team.name}
                  </DrillLink>
                  {seed > 0 && seed <= cut && <span className="u-seed">Seed {seed}</span>}
                  <span className="u-race-record">
                    {s.wins}-{s.losses}
                    {s.ties > 0 && `-${s.ties}`}
                  </span>
                </span>
                <span className="u-race-track" aria-hidden>
                  <span className="u-race-fill" />
                </span>
              </span>
              <span className="u-race-pf">
                <CountUp value={s.pf} decimals={1} />
              </span>
            </li>
          );
        })}
      </ol>
    </HomeCard>
  );
}

const STATUS = { alive: "Alive", clinched: "In", eliminated: "Out" } as const;

// The World Cup's divisions side by side, each team's bar its divisional win rate.
export function CupRace({ data, teamFor, myRosterId }: RaceProps) {
  const legend = useId();
  const [load, retry] = useLoad(getWorldCup, "world-cup");
  return (
    <HomeCard title="World Cup race" more={{ to: { kind: "world-cup", params: {} }, label: "World Cup" }} className="u-cup">
      {load.status === "loading" && <p role="status">Loading World Cup standings...</p>}
      {load.status === "error" && <LoadError what="World Cup standings" message={load.message} onRetry={retry} />}
      {load.status === "ok" && load.value.divisions.length === 0 && <p>No divisional games have been played yet.</p>}
      {load.status === "ok" && load.value.divisions.length > 0 && (
        <div className="u-cup-divs" aria-describedby={legend}>
          <p id={legend} className="u-race-legend">
            <span className="u-race-key" aria-hidden>
              <span className="u-race-fill" />
            </span>
            Bars: divisional win rate, ties counting half.
          </p>
          {load.value.divisions.map((d) => (
            <section key={d.division} aria-label={d.name} className="u-cup-div">
              <h4 className="u-cup-name">
                {d.name}
                <small>{d.gamesRemaining} left</small>
              </h4>
              <ol>
                {d.teams.map((t, i) => {
                  const rosterId = data ? rosterOf(data.rosters, t.userId) : null;
                  const team = rosterId !== null ? teamFor(rosterId) : { name: t.teamName || t.username, avatarUrl: teamAvatar(data?.users.find((u) => u.user_id === t.userId)) };
                  const games = t.wins + t.losses + t.ties;
                  return (
                    <li
                      key={t.userId}
                      className="u-cup-row"
                      data-status={t.status}
                      data-mine={(rosterId !== null && rosterId === myRosterId) || undefined}
                      style={bar(games ? (t.wins + t.ties / 2) / games : 0, i)}
                    >
                      <TeamAvatar name={team.name} url={team.avatarUrl} size={24} className="u-cup-avatar" />
                      <span className="u-cup-main">
                        <span className="u-cup-line">
                          <span className="u-cup-team">{team.name}</span>
                          <span className="u-cup-record">
                            {t.wins}-{t.losses}
                            {t.ties > 0 && `-${t.ties}`}
                          </span>
                        </span>
                        <span className="u-race-track" aria-hidden>
                          <span className="u-race-fill" />
                        </span>
                      </span>
                      <span className="u-cup-status">{STATUS[t.status]}</span>
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
        </div>
      )}
    </HomeCard>
  );
}
