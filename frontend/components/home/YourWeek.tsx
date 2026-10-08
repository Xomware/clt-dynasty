"use client";

import { type ReactNode, useId } from "react";

import { DrillLink } from "@/components/xp/DrillLink";
import { RosterMoveIcon } from "@/components/xp/icons";
import { LoadError } from "@/components/xp/LoadError";
import { PlayerLink } from "@/components/xp/PlayerLink";
import { playerName } from "@/lib/api/players";
import { LEAGUE_ID } from "@/lib/config";
import type { Flag, LineupCheck } from "@/lib/home/lineup";
import type { PlayerWeek } from "@/lib/home/projections";
import { useLineup } from "@/lib/home/use-lineup";
import { usePlayers } from "@/lib/league/players";
import type { LeagueData } from "@/lib/league/use-league";
import { HomeCard } from "./HomeCard";

// Sleeper owns lineups and moves. On a phone Sleeper sends this link on to
// its app; on a computer it opens the team on sleeper.com.
export const SLEEPER_TEAM_URL = `https://sleeper.com/leagues/${LEAGUE_ID}/team`;

const SLOT_LABEL: Record<string, string> = { SUPER_FLEX: "SFLX", FLEX: "FLEX" };
const pts = (n: number) => n.toFixed(1);

interface YourWeekProps {
  data: LeagueData | null;
  myRosterId: number | null;
  memberLoading: boolean;
}

// The signed-in member's to-do list for the week: their lineup against this
// week's projections, then (later sections) pickups and trades.
export function YourWeek({ data, myRosterId, memberLoading }: YourWeekProps) {
  const unlinked = data !== null && !memberLoading && myRosterId === null;
  return (
    <HomeCard title="Your week" className="yw">
      {unlinked ? (
        <p>
          Link your Sleeper account to get lineup checks, pickups and trade ideas for your team.{" "}
          <DrillLink to={{ kind: "settings", params: {} }} className="home-more">
            Link it in Settings
          </DrillLink>
        </p>
      ) : (
        <div className="yw-grid">
          <LineupSection data={data} rosterId={memberLoading ? null : myRosterId} />
        </div>
      )}
    </HomeCard>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const id = useId();
  return (
    <section className="yw-sec" aria-labelledby={id}>
      <h4 id={id} className="yw-title">
        {title}
      </h4>
      {children}
    </section>
  );
}

function LineupSection({ data, rosterId }: { data: LeagueData | null; rosterId: number | null }) {
  const { state, recheck } = useLineup(data, rosterId);
  const players = usePlayers();
  const name = (id: string) => playerName(players.status === "ok" ? players.players[id] : undefined, id);

  return (
    <Section title={state.status === "ok" ? `Lineup check, Week ${state.week}` : "Lineup check"}>
      {state.status === "off" && <p>Lineup checks start when the season does.</p>}
      {state.status === "loading" && <p role="status">Checking your lineup against this week&rsquo;s projections...</p>}
      {state.status === "error" && <LoadError what="this week's projections" message={state.message} onRetry={recheck} />}
      {state.status === "ok" && <LineupBody check={state.check} player={state.player} name={name} />}
      <div className="yw-actions">
        <a className="xp-button yw-action" href={SLEEPER_TEAM_URL} target="_blank" rel="noreferrer">
          <RosterMoveIcon width={20} height={20} className="flex-none" aria-hidden />
          Set your lineup in Sleeper
          <span className="sr-only"> (opens Sleeper)</span>
        </a>
        {state.status === "ok" && (
          <button type="button" className="xp-button yw-action" onClick={recheck}>
            Check again
          </button>
        )}
      </div>
      <p className="yw-note">
        Projections are Sleeper&rsquo;s (from Rotowire), scored with CLT&rsquo;s settings and checked every five minutes.
        Players whose games have kicked off stay where they are.
      </p>
    </Section>
  );
}

const FLAG_TEXT: Partial<Record<Flag, string>> = { out: "is out", bye: "is on bye", doubtful: "is doubtful", empty: "" };

interface BodyProps {
  check: LineupCheck;
  player: (id: string) => PlayerWeek;
  name: (id: string) => string;
}

function LineupBody({ check, player, name }: BodyProps) {
  const swapped = new Set(check.swaps.map((s) => s.out));
  // Out, bye and doubtful starters the swaps don't already bench, and empty slots nobody can fill.
  const warnings = check.starters.filter((s) => !swapped.has(s.id) && s.flags.some((f) => f !== "outscored"));
  const gain = Math.round((check.best - check.projected) * 10) / 10;
  const link = (id: string) => (
    <PlayerLink id={id} className="yw-player">
      {name(id)}
    </PlayerLink>
  );

  return (
    <div aria-live="polite" className="yw-body">
      <p className="yw-total">
        Starters project <strong>{pts(check.projected)}</strong>
        {gain > 0 && (
          <>
            , your best lineup <strong>{pts(check.best)}</strong> <span className="yw-gain">+{pts(gain)}</span>
          </>
        )}
      </p>
      {check.swaps.length === 0 && warnings.length === 0 && (
        <p className="yw-ok">Set. No bench player projects higher than a starter he could replace.</p>
      )}
      {check.swaps.length > 0 && (
        <ul className="yw-list" aria-label="Suggested swaps">
          {check.swaps.map((s) => (
            <li key={s.in} className="yw-item" data-kind="swap">
              <span className="yw-slot">{SLOT_LABEL[s.slot] ?? s.slot}</span>
              <span className="yw-line">
                {s.out ? (
                  <>
                    Swap {link(s.out)} <span className="yw-pts">{pts(s.outPoints)}</span>
                    {reason(player(s.out)) && <span className="yw-why"> ({reason(player(s.out))})</span>} for {link(s.in)}{" "}
                    <span className="yw-pts">{pts(s.inPoints)}</span>
                  </>
                ) : (
                  <>
                    Empty slot: start {link(s.in)} <span className="yw-pts">{pts(s.inPoints)}</span>
                  </>
                )}
                {s.move && (
                  <span className="yw-why">
                    {" "}
                    and slide {link(s.move.id)} to {SLOT_LABEL[s.move.to] ?? s.move.to}
                  </span>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
      {warnings.length > 0 && (
        <ul className="yw-list" aria-label="Lineup warnings">
          {warnings.map((s) => (
            <li key={`${s.slot}:${s.id}`} className="yw-item" data-kind="warn">
              <span className="yw-slot">{SLOT_LABEL[s.slot] ?? s.slot}</span>
              <span className="yw-line">
                {s.id === null ? (
                  "Empty, and nobody on your bench can play it"
                ) : (
                  <>
                    {link(s.id)} {s.flags.map((f) => FLAG_TEXT[f]).filter(Boolean).join(", ")}
                    {s.flags.includes("doubtful") ? ` (projects ${pts(s.points)})` : ", and nobody on your bench can play the slot"}
                  </>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const reason = (w: PlayerWeek) => (w.bye ? "on bye" : (w.injury ?? "").toLowerCase());
