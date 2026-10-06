"use client";

import { Fragment, type ReactNode } from "react";

import { LoadError } from "@/components/xp/LoadError";
import { PlayerLink } from "@/components/xp/PlayerLink";
import { TeamLink } from "@/components/xp/TeamLink";
import { playerName } from "@/lib/api/players";
import { type Move, recentMoves } from "@/lib/home/transactions";
import { usePlayers } from "@/lib/league/players";
import type { Team } from "@/lib/league/use-league";
import { useLoad } from "@/lib/use-load";
import { HomeCard } from "./HomeCard";

const WHEN = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
const KIND: Record<Move["type"], string> = { trade: "Trade", waiver: "Waiver", free_agent: "Free agent", commissioner: "Commish" };

interface MovesCardProps {
  week: number | undefined;
  live: boolean;
  teamFor: (rosterId: number) => Team;
  myRosterId: number | null;
}

export function MovesCard({ week, ...props }: MovesCardProps) {
  return (
    <HomeCard title="Recent transactions">
      {week === undefined ? <p role="status">Loading league transactions...</p> : <Moves week={week} {...props} />}
    </HomeCard>
  );
}

function Moves({ week, live, teamFor, myRosterId }: MovesCardProps & { week: number }) {
  const [load, retry] = useLoad(() => recentMoves(week, live), `moves/${week}`);
  const players = usePlayers();
  const name = (id: string) => playerName(players.status === "ok" ? players.players[id] : undefined, id);
  const list = (ids: string[]) =>
    ids.map((id, i) => (
      <Fragment key={id}>
        {i > 0 && ", "}
        <PlayerLink id={id}>{name(id)}</PlayerLink>
      </Fragment>
    ));

  return (
    <>
      {load.status === "loading" && <p role="status">Loading league transactions...</p>}
      {load.status === "error" && <LoadError what="league transactions" message={load.message} onRetry={retry} />}
      {load.status === "ok" && load.value.length === 0 && <p>No adds, drops or trades in the last two weeks.</p>}
      {load.status === "ok" && load.value.length > 0 && (
        <ul className="home-list">
          {load.value.map((m) => (
            <li key={m.id} className="home-list-item">
              <p className="flex flex-wrap items-center gap-x-2">
                <span className="xp-tag" data-kind={m.type}>
                  {KIND[m.type]}
                </span>
                <span className="text-xs">{WHEN.format(m.at)}</span>
                {m.bid !== null && <span className="text-xs">${m.bid} FAAB</span>}
              </p>
              {m.sides.map((s) => (
                <div key={s.rosterId} className="home-list-detail">
                  <TeamLink rosterId={s.rosterId} {...teamFor(s.rosterId)} isMine={s.rosterId === myRosterId} />
                  <span>
                    {(
                      [
                        s.adds.length > 0 && <>{m.type === "trade" ? "gets" : "adds"} {list(s.adds)}</>,
                        s.picks.length > 0 && `gets ${s.picks.join(", ")}`,
                        s.faab > 0 && `gets $${s.faab} FAAB`,
                        m.type !== "trade" && s.drops.length > 0 && <>drops {list(s.drops)}</>,
                      ].filter(Boolean) as ReactNode[]
                    ).map((part, i) => (
                      <Fragment key={i}>
                        {i > 0 && "; "}
                        {part}
                      </Fragment>
                    ))}
                  </span>
                </div>
              ))}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
