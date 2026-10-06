"use client";

import { LoadError } from "@/components/xp/LoadError";
import { TeamLink } from "@/components/xp/TeamLink";
import { getWorldCup } from "@/lib/api/clt";
import type { LeagueData, Team } from "@/lib/league/use-league";
import { rosterOf } from "@/lib/sleeper/rosters";
import { useLoad } from "@/lib/use-load";
import { HomeCard } from "./HomeCard";

import "@/components/windows/league.css";

const STATUS = { alive: "Alive", clinched: "In", eliminated: "Out" } as const;

interface WorldCupCardProps {
  data: LeagueData | null;
  teamFor: (rosterId: number) => Team;
  myRosterId: number | null;
}

// The top two in each division qualify, so those are the leaders shown.
export function WorldCupCard({ data, teamFor, myRosterId }: WorldCupCardProps) {
  const [load, retry] = useLoad(getWorldCup, "world-cup");
  return (
    <HomeCard title="World Cup leaders" more={{ to: { kind: "world-cup", params: {} }, label: "World Cup" }}>
      {load.status === "loading" && <p role="status">Loading World Cup standings...</p>}
      {load.status === "error" && <LoadError what="World Cup standings" message={load.message} onRetry={retry} />}
      {load.status === "ok" && load.value.divisions.length === 0 && <p>No divisional games have been played yet.</p>}
      {load.status === "ok" && load.value.divisions.length > 0 && (
        <div className="home-cup">
          {load.value.divisions.map((d) => (
            <div key={d.division}>
              <h4 className="home-sub">{d.name}</h4>
              <ol className="home-rows">
                {d.teams.slice(0, 2).map((t) => {
                  const rosterId = data ? rosterOf(data.rosters, t.userId) : null;
                  return (
                    <li key={t.userId} className="home-row" data-mine={(rosterId !== null && rosterId === myRosterId) || undefined}>
                      {rosterId !== null ? (
                        <TeamLink rosterId={rosterId} {...teamFor(rosterId)} isMine={rosterId === myRosterId} />
                      ) : (
                        <span className="xp-team-name">{t.teamName || t.username}</span>
                      )}
                      <span className="home-row-stat">
                        {t.wins}-{t.losses}
                        {t.ties > 0 && `-${t.ties}`}
                      </span>
                      <span className="xp-tag world-cup-status" data-status={t.status}>
                        {STATUS[t.status]}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </div>
          ))}
        </div>
      )}
    </HomeCard>
  );
}
