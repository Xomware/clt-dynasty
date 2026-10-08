"use client";

import { type ReactNode, useId } from "react";

import { DrillLink } from "@/components/xp/DrillLink";
import { RosterMoveIcon } from "@/components/xp/icons";
import { LoadError } from "@/components/xp/LoadError";
import { PlayerLink } from "@/components/xp/PlayerLink";
import { TeamName } from "@/components/xp/TeamName";
import { playerName } from "@/lib/api/players";
import { LEAGUE_ID } from "@/lib/config";
import type { Flag, LineupCheck } from "@/lib/home/lineup";
import type { PlayerWeek } from "@/lib/home/projections";
import { useLineup } from "@/lib/home/use-lineup";
import { useTradeIdeas } from "@/lib/home/use-trade-ideas";
import { useWaivers } from "@/lib/home/use-waivers";
import type { Candidate, Pickup } from "@/lib/home/waivers";
import { usePlayers } from "@/lib/league/players";
import type { recommendTrades, TradePlayer } from "@/lib/analyzer/trades";
import type { LeagueData } from "@/lib/league/use-league";
import { teamLink } from "@/lib/team/links";
import { ordinal, slotLabel } from "@/lib/team/team";
import { HomeCard } from "./HomeCard";

// Sleeper owns lineups and moves. On a phone Sleeper sends this link on to
// its app; on a computer it opens the team on sleeper.com.
export const SLEEPER_TEAM_URL = `https://sleeper.com/leagues/${LEAGUE_ID}/team`;

const pts = (n: number) => n.toFixed(1);

interface YourWeekProps {
  data: LeagueData | null;
  myRosterId: number | null;
  memberLoading: boolean;
}

// The signed-in member's to-do list for the week: their lineup against this
// week's projections, free agents worth picking up and the Team Analyzer's
// best trade ideas.
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
          <WaiverSection data={data} rosterId={memberLoading ? null : myRosterId} />
          <TradeSection rosterId={memberLoading ? null : myRosterId} />
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
              <span className="yw-slot">{slotLabel(s.slot)}</span>
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
                    and slide {link(s.move.id)} to {slotLabel(s.move.to)}
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
              <span className="yw-slot">{slotLabel(s.slot)}</span>
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

const fmt = (n: number) => Math.round(n).toLocaleString("en-US");

function WaiverSection({ data, rosterId }: { data: LeagueData | null; rosterId: number | null }) {
  const { state, retry } = useWaivers(data, rosterId);
  const players = usePlayers();
  const name = (id: string) => playerName(players.status === "ok" ? players.players[id] : undefined, id);
  const link = (id: string) => (
    <PlayerLink id={id} className="yw-player">
      {name(id)}
    </PlayerLink>
  );

  return (
    <Section title="Waiver wire">
      {state.status === "off" && <p>Pickup ideas start when the season does.</p>}
      {state.status === "loading" && <p role="status">Sizing up the free agents...</p>}
      {state.status === "error" && <LoadError what="free agents and player values" message={state.message} onRetry={retry} />}
      {state.status === "ok" && (
        <div aria-live="polite" className="yw-body">
          {state.closed && (
            <p className="yw-closed">
              {state.closed === "season"
                ? "Add/drops closed at the end of the regular season."
                : "Adds are closed: this week's first game has kicked off. These are for next week."}
            </p>
          )}
          {state.picks.length === 0 ? (
            <p className="yw-ok">No free agent clearly beats the bottom of your bench right now.</p>
          ) : (
            <ul className="yw-list" aria-label="Suggested pickups">
              {state.picks.map((p) => (
                <li key={p.add.id} className="yw-item" data-kind="add">
                  <span className="yw-slot">{p.add.position}</span>
                  <span className="yw-line">
                    Add {link(p.add.id)}
                    {p.drop ? <>, drop {link(p.drop.id)}</> : ", into your open roster spot"}
                    <span className="yw-why yw-why-block">{why(p, players.status === "ok" ? players.players[p.add.id]?.team : undefined)}</span>
                    {p.drop && <span className="yw-why yw-why-block">{dropWhy(p.drop)}</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <p className="yw-note">
        Free agents are players on no CLT roster, ranked by FantasyCalc dynasty value plus this week&rsquo;s projection
        and weighted toward your thinnest positions. Drops come from your bench, never your lineup, taxi squad or IR.
      </p>
    </Section>
  );
}

function why({ add, need }: Pickup, team: string | undefined): string {
  const depth = `${add.position} depth ${ordinal(need.valueRank)} of ${need.teams} by value, ${ordinal(need.weekRank)} this week`;
  const week = !team ? "no NFL team" : add.points > 0 ? `projects ${pts(add.points)} this week` : "no projection this week";
  return `${depth}. ${week[0].toUpperCase()}${week.slice(1)}, dynasty value ${fmt(add.value)}.`;
}

const dropWhy = (d: Candidate) => `Your weakest bench player: value ${fmt(d.value)}, projects ${pts(d.points)}.`;

const pct = (n: number) => `${Math.round(n * 100)}%`;

function TradeSection({ rosterId }: { rosterId: number | null }) {
  const { state, retry } = useTradeIdeas(rosterId);
  return (
    <Section title="Trade ideas">
      {state.status === "loading" && <p role="status">Running the Team Analyzer...</p>}
      {state.status === "error" && <LoadError what="trade ideas" message={state.message} onRetry={retry} />}
      {state.status === "ok" && <TradeBody ideas={state.ideas} />}
      <DrillLink to={{ kind: "analyzer", params: { tab: "trades" } }} className="home-more">
        All trade ideas in the Team Analyzer
      </DrillLink>
    </Section>
  );
}

function TradeBody({ ideas: { weak, strong, trades } }: { ideas: ReturnType<typeof recommendTrades> }) {
  if (weak.length === 0) return <p className="yw-ok">No starting position is 15% under the league average, so there&rsquo;s no hole to trade for.</p>;
  if (strong.length === 0) return <p className="yw-ok">Short at {weak.join(", ")}, but nothing is deep enough to trade from.</p>;
  if (trades.length === 0) return <p className="yw-ok">Short at {weak.join(", ")} and deep at {strong.join(", ")}, but no partner has a fair one-for-one.</p>;
  return (
    <ul className="yw-list" aria-label="Trade ideas">
      {trades.map((t) => (
        <li key={`${t.partner.rosterId}:${t.give.id}:${t.receive.id}`} className="yw-item yw-trade" data-kind="trade">
          <span className="yw-slot">{t.receive.position}</span>
          <span className="yw-line">
            <span className="yw-with">
              With{" "}
              <DrillLink to={teamLink(LEAGUE_ID, t.partner.rosterId)} className="min-w-0">
                <TeamName name={t.partner.name} avatarUrl={t.partner.avatarUrl} />
              </DrillLink>
            </span>
            <span className="yw-sides">
              <TradeSide label="Give" player={t.give} />
              <TradeSide label="Get" player={t.receive} />
            </span>
            <span className="yw-why yw-why-block">
              Adds {fmt(t.improvement)} value at {t.receive.position}, where you&rsquo;re short. Values{" "}
              {t.gap === 0 ? "match" : t.gap < 0.005 ? "within 1%" : `${pct(t.gap)} apart`}.
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function TradeSide({ label, player }: { label: string; player: TradePlayer }) {
  return (
    <span className="yw-side">
      <span className="yw-side-label">{label}</span>
      <PlayerLink id={player.id} className="yw-player">
        {player.name}
      </PlayerLink>
      <span className="yw-why">
        {player.position} · {fmt(player.value)}
      </span>
    </span>
  );
}
