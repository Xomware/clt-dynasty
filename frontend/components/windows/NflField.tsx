"use client";

import Image from "next/image";
import { type CSSProperties, useState } from "react";

import { DrillLink } from "@/components/xp/DrillLink";
import { InjuryBadge } from "@/components/xp/InjuryBadge";
import { PlayerFace } from "@/components/xp/PlayerFace";
import { RankChips } from "@/components/xp/RankChips";
import { type Player, playerName } from "@/lib/api/players";
import type { Team } from "@/lib/league/use-league";
import { formation, OL_X, type Slot, SPECIAL_TEAMS } from "@/lib/nfl/formation";
import { designation, designationText, LEGEND, sidelined } from "@/lib/nfl/injury";
import { NFL_COLORS, type NflTeam, nflLogo, nflTeamName } from "@/lib/nfl/teams";
import type { RankLookup } from "@/lib/nfl/use-ranks";
import { playerLink } from "@/lib/player/links";

import "./nfl-field.css";

export interface Owner {
  rosterId: number;
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
const OL = ["LT", "LG", "C", "RG", "RT"];

// The depth chart as an offense at the line of scrimmage, attacking the end
// zone at the top. Spots sit by token rows behind the line (nfl-field.css
// sizes a row), so the formation holds its shape at any width.
export function NflField({ team, players, ownerOf, ranks }: NflFieldProps) {
  const all = formation(players, team.abbr);
  const slots = all.filter((s) => !SPECIAL_TEAMS.has(s.id));
  const special = all.filter((s) => SPECIAL_TEAMS.has(s.id));
  const [open, setOpen] = useState<string | null>(null);
  const [paint, ink] = NFL_COLORS[team.abbr] ?? ["#245edb", "#f4f1e6"];
  const toggle = (id: string) => setOpen(open === id ? null : id);

  if (all.length === 0) return <p className="xp-note">Sleeper has no depth chart for the {team.name} yet.</p>;

  return (
    <section aria-label={`${nflTeamName(team)} depth chart`} className="nfl-field-wrap" style={{ "--ez": paint, "--ez-ink": ink } as CSSProperties}>
      <div className="nfl-field">
        <div className="nfl-endzone" aria-hidden>
          <Image src={nflLogo(team.abbr)} alt="" width={64} height={64} unoptimized className="nfl-endzone-logo" />
          <span className="nfl-endzone-name">{team.name}</span>
          <Image src={nflLogo(team.abbr)} alt="" width={64} height={64} unoptimized className="nfl-endzone-logo" />
        </div>
        {[10, 20, 30].map((yd) => (
          <span key={yd} className="nfl-yard-number" style={{ "--yd": yd } as CSSProperties} aria-hidden>
            {yd}
          </span>
        ))}
        <span className="nfl-first-down" aria-hidden />
        <span className="nfl-los" aria-hidden />
        <span className="nfl-ball" style={{ left: `${OL_X[2]}%` }} aria-hidden />
        <ul className="nfl-line" role="img" aria-label="Offensive line: Sleeper doesn't chart linemen">
          {OL.map((pos, i) => (
            <li key={pos} className="nfl-lineman" style={{ left: `${OL_X[i]}%` }}>
              {pos}
            </li>
          ))}
        </ul>
        <ul className="nfl-spots">
          {slots.map((s) => (
            <Spot key={s.id} slot={s} open={open === s.id} onToggle={() => toggle(s.id)} ownerOf={ownerOf} ranks={ranks} />
          ))}
        </ul>
      </div>
      {special.length > 0 && (
        <section className="nfl-special" aria-label="Special teams">
          <h4 className="nfl-special-title">Special teams</h4>
          <ul>
            {special.map((s) => (
              <Spot key={s.id} slot={s} open={open === s.id} onToggle={() => toggle(s.id)} ownerOf={ownerOf} ranks={ranks} />
            ))}
          </ul>
        </section>
      )}
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
    <li
      className="nfl-spot"
      style={{ "--x": `${slot.x}%`, "--x-wide": `${slot.wide ?? slot.x}%`, "--row": slot.row } as CSSProperties}
      data-open={open || undefined}
    >
      <div className="nfl-card">
        <Token player={starter} role={`${slot.label}, starter`} owner={ownerOf(starter.player_id)} ranks={ranks} />
        <span className="nfl-spot-code" aria-hidden>
          {slot.id === "SLOT" ? "S" : slot.id}
        </span>
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
            {open ? "\u2212" : `+${backups.length}`}
          </button>
        )}
      </div>
      {/* The next two on the chart, so depth reads without a tap; the toggle has them all. */}
      {backups.length > 0 && (
        <ol className="nfl-depth" aria-hidden>
          {backups.slice(0, 2).map((p, i) => {
            const d = designation(p);
            return (
              <li key={p.player_id}>
                <span className="nfl-depth-n">{i + 2}</span> {p.last_name ?? playerName(p, p.player_id)}
                {d && <span className="nfl-depth-inj"> {d.code}</span>}
              </li>
            );
          })}
        </ol>
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
