"use client";

import Image from "next/image";
import { type CSSProperties, useState } from "react";

import { DrillLink } from "@/components/xp/DrillLink";
import { InjuryBadge } from "@/components/xp/InjuryBadge";
import { PlayerFace } from "@/components/xp/PlayerFace";
import { RankChips } from "@/components/xp/RankChips";
import { type Player, playerName } from "@/lib/api/players";
import type { Team } from "@/lib/league/use-league";
import { formation, type Slot } from "@/lib/nfl/formation";
import { designation, designationText, LEGEND, sidelined } from "@/lib/nfl/injury";
import { NFL_COLORS, type NflTeam, nflLogo, nflTeamName } from "@/lib/nfl/teams";
import type { RankLookup } from "@/lib/nfl/use-ranks";
import { playerLink } from "@/lib/player/links";

import "./nfl-field.css";

export interface Owner {
  team: Team;
  mine: boolean;
}

interface NflFieldProps {
  team: NflTeam;
  players: Record<string, Player>;
  ownerOf: (id: string) => Owner | null;
  ranks: RankLookup;
}

const STRING = ["Starter", "2nd string", "3rd string"];
const string = (i: number) => STRING[i] ?? `${i + 1}th string`;

// Yard lines every five yards from the goal line; the end zone takes the top 12%.
const GOAL = 12;
const YARD = (100 - GOAL) / 40;

// The depth chart as an offense lined up on the team's own field.
export function NflField({ team, players, ownerOf, ranks }: NflFieldProps) {
  const slots = formation(players, team.abbr);
  const [open, setOpen] = useState<string | null>(null);
  const [paint, ink] = NFL_COLORS[team.abbr] ?? ["#245edb", "#f4f1e6"];

  if (slots.length === 0) return <p className="xp-note">Sleeper has no depth chart for the {team.name} yet.</p>;

  return (
    <section aria-label={`${nflTeamName(team)} depth chart`} className="nfl-field-wrap">
      <div className="nfl-field" style={{ "--ez": paint, "--ez-ink": ink } as CSSProperties}>
        <svg className="nfl-field-lines" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden focusable="false">
          {Array.from({ length: 9 }, (_, i) => (
            <line key={i} x1="0" x2="100" y1={GOAL + i * 5 * YARD} y2={GOAL + i * 5 * YARD} data-goal={i === 0 || undefined} />
          ))}
          {Array.from({ length: 40 }, (_, i) =>
            [3, 40, 60, 97].map((x) => (
              <line key={`${i}-${x}`} className="nfl-hash" x1={x - 1} x2={x + 1} y1={GOAL + (i + 1) * YARD} y2={GOAL + (i + 1) * YARD} />
            )),
          )}
        </svg>
        <div className="nfl-endzone" aria-hidden>
          <Image src={nflLogo(team.abbr)} alt="" width={64} height={64} unoptimized className="nfl-endzone-logo" />
          <span className="nfl-endzone-name">{team.name}</span>
          <Image src={nflLogo(team.abbr)} alt="" width={64} height={64} unoptimized className="nfl-endzone-logo" />
        </div>
        {[10, 20, 30].map((yd) => (
          <span key={yd} className="nfl-yard-number" style={{ top: `${GOAL + yd * YARD}%` }} aria-hidden>
            {yd}
          </span>
        ))}
        <ul className="nfl-spots">
          {slots.map((s) => (
            <Spot key={s.id} slot={s} open={open === s.id} onToggle={() => setOpen(open === s.id ? null : s.id)} ownerOf={ownerOf} ranks={ranks} />
          ))}
        </ul>
      </div>
      <Legend week={ranks.week} />
    </section>
  );
}

interface SpotProps {
  slot: Slot;
  open: boolean;
  onToggle: () => void;
  ownerOf: (id: string) => Owner | null;
  ranks: RankLookup;
}

function Spot({ slot, open, onToggle, ownerOf, ranks }: SpotProps) {
  const [starter, ...backups] = slot.players;
  const listId = `nfl-backups-${slot.id}`;
  return (
    <li className="nfl-spot" style={{ left: `${slot.x}%`, top: `${slot.y}%` }} data-open={open || undefined}>
      <span className="nfl-spot-code" aria-hidden>
        {slot.id === "SLOT" ? "S" : slot.id}
      </span>
      <Token player={starter} role={`${slot.label}, starter`} owner={ownerOf(starter.player_id)} ranks={ranks} />
      {backups.length > 0 && (
        <button
          type="button"
          className="nfl-spot-more"
          aria-expanded={open}
          aria-controls={listId}
          aria-label={`${slot.label} backups, ${backups.length}`}
          onClick={onToggle}
          onKeyDown={(e) => e.key === "Escape" && open && onToggle()}
        >
          {open ? "Hide" : `+${backups.length}`}
        </button>
      )}
      {open && (
        <ol id={listId} className="nfl-backups" aria-label={`${slot.label} backups`} onKeyDown={(e) => e.key === "Escape" && onToggle()}>
          {backups.map((p, i) => (
            <li key={p.player_id}>
              <Token player={p} role={`${slot.label}, ${string(i + 1)}`} owner={ownerOf(p.player_id)} ranks={ranks} small />
            </li>
          ))}
        </ol>
      )}
    </li>
  );
}

interface TokenProps {
  player: Player;
  role: string;
  owner: Owner | null;
  ranks: RankLookup;
  small?: boolean;
}

function Token({ player, role, owner, ranks, small = false }: TokenProps) {
  const d = designation(player);
  const r = ranks(player.player_id);
  const name = playerName(player, player.player_id);
  const rankText = [
    r.season && `season ${r.season.position}${r.season.rank}`,
    r.projected && ranks.week && `week ${ranks.week} ${r.projected.position}${r.projected.rank}`,
    r.dynasty && `dynasty ${r.dynasty.position}${r.dynasty.rank}`,
  ];
  const label = [
    `${role}: ${name}`,
    player.number ? `#${player.number}` : null,
    d && designationText(d, player.injury_body_part),
    owner ? `on ${owner.team.name}` : "free agent",
    ...rankText,
  ]
    .filter(Boolean)
    .join(", ");
  return (
    <DrillLink to={playerLink(player.player_id)} label={label} className="nfl-token">
      <span className="nfl-token-face" data-injured={d ? "" : undefined} data-sidelined={d && sidelined(d) ? "" : undefined}>
        <PlayerFace id={player.player_id} position={player.position} size={small ? 80 : 112} />
        {player.number ? <span className="nfl-token-number">{player.number}</span> : null}
        {d && <InjuryBadge designation={d} bodyPart={player.injury_body_part} />}
      </span>
      <span className="nfl-token-name">{small ? name : (player.last_name ?? name)}</span>
      {owner && (
        <span className="nfl-owner" data-owner={owner.mine ? "mine" : undefined}>
          {owner.team.name}
        </span>
      )}
      {!small && <RankChips ranks={r} week={ranks.week} compact />}
    </DrillLink>
  );
}

function Legend({ week }: { week: number | null }) {
  return (
    <section className="nfl-legend" aria-label="Injury designations">
      <h4 className="nfl-legend-title">Injury designations</h4>
      <dl>
        {LEGEND.map((d) => (
          <div key={d.code}>
            <dt aria-hidden>
              <InjuryBadge designation={d} />
            </dt>
            <dd>
              <span className="sr-only">{d.code}: </span>
              {d.label}
            </dd>
          </div>
        ))}
      </dl>
      <p className="nfl-legend-note">Gray: on the injury report. Faded: not expected to play.</p>
      <h4 className="nfl-legend-title">Ranks</h4>
      <p className="nfl-legend-ranks">
        <span className="xp-rank-key" data-kind="season">
          Season, CLT scoring
        </span>
        {week && (
          <span className="xp-rank-key" data-kind="week">
            Week {week} projection
          </span>
        )}
        <span className="xp-rank-key" data-kind="dynasty">
          Dynasty, FantasyCalc superflex
        </span>
      </p>
    </section>
  );
}
