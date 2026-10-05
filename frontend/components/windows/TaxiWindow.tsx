"use client";

import { useEffect, useMemo, useState } from "react";

import { pastDrafts } from "@/components/windows/DraftHistoryWindow";
import { LoadError } from "@/components/xp/LoadError";
import { TeamName } from "@/components/xp/TeamName";
import { useAlerts } from "@/lib/alerts/alerts";
import { type Player, playerName } from "@/lib/api/players";
import { listTaxiRequests, requestSteal, type TaxiRequest } from "@/lib/api/taxi";
import { usePlayers } from "@/lib/league/players";
import { useLeague } from "@/lib/league/use-league";

import "./league.css";

type Requests = { status: "loading" } | { status: "error"; message: string } | { status: "ok"; list: TaxiRequest[] };

const DATE = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

// Where each player was drafted, across every season's finished drafts: "2026 1.04".
function useDraftSlots(): Map<string, string> | null {
  const past = pastDrafts.use();
  return useMemo(() => {
    if (past.status !== "ok") return null;
    const slots = new Map<string, string>();
    // Newest draft first, so a player taken twice (a startup, then a re-draft) shows the latest.
    for (const { draft, picks } of past.drafts) {
      for (const p of picks) {
        if (slots.has(p.player_id)) continue;
        const inRound = p.pick_no - (p.round - 1) * draft.settings.teams;
        slots.set(p.player_id, `${draft.season} ${p.round}.${String(inRound).padStart(2, "0")}`);
      }
    }
    return slots;
  }, [past]);
}

export function TaxiWindow() {
  const { data, error, teamFor, myRosterId } = useLeague();
  const players = usePlayers();
  const slots = useDraftSlots();
  const [requests, setRequests] = useState<Requests>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    listTaxiRequests().then(
      (list) => live && setRequests({ status: "ok", list }),
      (e: Error) => live && setRequests({ status: "error", message: e.message }),
    );
    return () => {
      live = false;
    };
  }, [attempt]);

  if (error) return <p role="alert">Couldn&rsquo;t reach Sleeper ({error}). Close Taxi Squads and open it again to retry.</p>;
  if (requests.status === "error") {
    return (
      <LoadError
        what="steal requests"
        message={requests.message}
        onRetry={() => {
          setRequests({ status: "loading" });
          setAttempt((n) => n + 1);
        }}
      />
    );
  }
  if (!data || requests.status === "loading" || players.status === "loading") return <p role="status">Loading taxi squads...</p>;
  if (players.status === "error") return <p role="alert">Couldn&rsquo;t load player names ({players.message}). Reopen Taxi Squads to retry.</p>;

  const squads = data.rosters
    .filter((r) => r.taxi?.length)
    .sort((a, b) => Number(b.roster_id === myRosterId) - Number(a.roster_id === myRosterId) || a.roster_id - b.roster_id);
  if (squads.length === 0) return <p>No team has a player on its taxi squad right now.</p>;

  const requestFor = (playerId: string) => requests.list.find((r) => r.playerId === playerId);
  const added = (r: TaxiRequest) => setRequests({ status: "ok", list: [r, ...requests.list] });

  return (
    <div className="grid grid-cols-1 gap-3">
      <p>
        Request a steal on another team&rsquo;s taxi player. Each player takes one request, and the league is told when
        you make it.
      </p>
      {slots === null && <p className="text-xs">Loading where each player was drafted...</p>}
      {squads.map((roster) => {
        const team = teamFor(roster.roster_id);
        const mine = roster.roster_id === myRosterId;
        return (
          <section key={roster.roster_id} aria-label={team.name}>
            <h3 className="xp-round-title">
              <TeamName name={team.name} avatarUrl={team.avatarUrl} isMine={mine} />
            </h3>
            <ul className="bg-(--xp-cream)">
              {(roster.taxi ?? []).map((id) => (
                <TaxiRow
                  key={id}
                  id={id}
                  player={players.players[id]}
                  slot={slots?.get(id)}
                  slotsLoaded={slots !== null}
                  mine={mine}
                  request={requestFor(id)}
                  team={team.name}
                  onRequested={added}
                />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

interface RowProps {
  id: string;
  player: Player | undefined;
  slot: string | undefined;
  slotsLoaded: boolean;
  mine: boolean;
  request: TaxiRequest | undefined;
  team: string;
  onRequested: (request: TaxiRequest) => void;
}

function TaxiRow({ id, player, slot, slotsLoaded, mine, request, team, onRequested }: RowProps) {
  const { alert } = useAlerts();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const name = playerName(player, id);

  const steal = async () => {
    const answer = await alert({
      kind: "warning",
      title: "Request a steal",
      body: `Request to steal ${name} from ${team}? The league is told, and the request can't be taken back here.`,
      buttons: ["Request", "Cancel"],
    });
    if (answer !== "Request") return;
    setBusy(true);
    setError(null);
    await requestSteal(id).then(onRequested, (e: Error) => setError(e.message));
    setBusy(false);
  };

  return (
    <li className="xp-player-row flex-wrap">
      <span className="xp-player-pos">{player?.position ?? ""}</span>
      <span className="xp-player-name">
        {name} <span className="xp-player-team">{player?.team || "FA"}</span>
        <span className="block text-xs">{slot ? `Drafted ${slot}` : slotsLoaded ? "Not drafted in this league" : ""}</span>
      </span>
      {request ? (
        <span className="xp-pick-owner">
          Steal requested by {request.isMine ? "you" : request.requestedBy || "a former member"}
          <span className="block">{DATE.format(new Date(request.createdAt))}</span>
        </span>
      ) : (
        !mine && (
          <button
            type="button"
            className="xp-button"
            aria-label={`Steal ${name}`}
            disabled={busy}
            onClick={(e) => {
              // Safari never focuses a clicked button, and the dialog restores focus to its opener.
              e.currentTarget.focus();
              void steal();
            }}
          >
            {busy ? "Requesting..." : "Steal"}
          </button>
        )
      )}
      {error && (
        <p role="alert" className="w-full">
          Couldn&rsquo;t request the steal: {error}
        </p>
      )}
    </li>
  );
}
