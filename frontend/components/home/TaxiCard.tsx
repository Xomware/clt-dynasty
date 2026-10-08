"use client";

import { TaxiIcon } from "@/components/xp/icons";
import { LoadError } from "@/components/xp/LoadError";
import { PlayerLink } from "@/components/xp/PlayerLink";
import { TeamLink } from "@/components/xp/TeamLink";
import { playerName } from "@/lib/api/players";
import { listTaxiRequests } from "@/lib/api/taxi";
import { usePlayers } from "@/lib/league/players";
import type { Team } from "@/lib/league/use-league";
import { useLoad } from "@/lib/use-load";
import { CardAction } from "./CardAction";
import { HomeCard } from "./HomeCard";

const DATE = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

interface TaxiCardProps {
  teamFor: (rosterId: number) => Team;
  myRosterId: number | null;
}

export function TaxiCard({ teamFor, myRosterId }: TaxiCardProps) {
  const [load, retry] = useLoad(listTaxiRequests, "taxi");
  const players = usePlayers();
  const recent = load.status === "ok" ? [...load.value].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 3) : [];

  return (
    <HomeCard title="Taxi steal requests" more={{ to: { kind: "taxi", params: {} }, label: "Taxi Squads" }}>
      {load.status === "loading" && <p role="status">Loading steal requests...</p>}
      {load.status === "error" && <LoadError what="steal requests" message={load.message} onRetry={retry} />}
      {load.status === "ok" && recent.length === 0 && <p>No steal requests on anyone&rsquo;s taxi squad.</p>}
      {recent.length > 0 && (
        <ul className="home-list">
          {recent.map((r) => {
            const player = players.status === "ok" ? players.players[r.playerId] : undefined;
            return (
              <li key={r.playerId} className="home-list-item">
                <p>
                  <PlayerLink id={r.playerId} className="font-bold">
                    {playerName(player, r.playerId)}
                  </PlayerLink>
                  {player?.position && ` (${player.position})`}
                  <span className="text-xs">, {DATE.format(new Date(r.createdAt))}</span>
                </p>
                <p className="home-list-detail">
                  From <TeamLink rosterId={r.rosterId} {...teamFor(r.rosterId)} isMine={r.rosterId === myRosterId} />
                  <span>{r.isMine ? "by you" : `by ${r.requestedBy || "a former member"}`}</span>
                </p>
              </li>
            );
          })}
        </ul>
      )}
      <CardAction to={{ kind: "taxi", params: {} }} Icon={TaxiIcon}>
        Steal a taxi player
      </CardAction>
    </HomeCard>
  );
}
