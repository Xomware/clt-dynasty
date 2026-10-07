"use client";

import Image from "next/image";
import { useState } from "react";

import { gameLabel, InClt, loadPage, type Page, playerTitle, type Week, Weeks } from "@/components/windows/PlayerWindow";
import { SilhouetteIcon } from "@/components/xp/icons";
import { LoadError } from "@/components/xp/LoadError";
import { NflTeamLink } from "@/components/xp/NflTeamLink";
import type { WindowParams } from "@/lib/desktop/windows";
import { nflLogo, nflTeam } from "@/lib/nfl/teams";
import { heightLabel } from "@/lib/player/season";
import { injuryTag } from "@/lib/team/team";
import { useLoad } from "@/lib/use-load";
import { TRIVIA } from "./trivia";

import "@/components/windows/player.css";
import "./buzz-card.css";

type Stats = Record<string, number>;

// The back of the card's stat columns, the position's own numbers, as a 90s set printed them.
const COLUMNS: Record<string, [string, (s: Stats) => number][]> = {
  QB: [
    ["YDS", (s) => s.pass_yd ?? 0],
    ["TD", (s) => s.pass_td ?? 0],
    ["INT", (s) => s.pass_int ?? 0],
  ],
  RB: [
    ["CAR", (s) => s.rush_att ?? 0],
    ["YDS", (s) => (s.rush_yd ?? 0) + (s.rec_yd ?? 0)],
    ["TD", (s) => (s.rush_td ?? 0) + (s.rec_td ?? 0)],
  ],
  WR: [
    ["REC", (s) => s.rec ?? 0],
    ["YDS", (s) => s.rec_yd ?? 0],
    ["TD", (s) => s.rec_td ?? 0],
  ],
  TE: [
    ["REC", (s) => s.rec ?? 0],
    ["YDS", (s) => s.rec_yd ?? 0],
    ["TD", (s) => s.rec_td ?? 0],
  ],
  K: [
    ["FG", (s) => s.fgm ?? 0],
    ["XP", (s) => s.xpm ?? 0],
  ],
};

// The same fact for a player every visit.
const factFor = (id: string) => TRIVIA[[...id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 9973, 7) % TRIVIA.length];

// Sleeper's full-size headshot; the thumb the rest of the site uses is too small for a card.
const portrait = (id: string, position: string | null) => (position === "DEF" ? nflLogo(id) : `https://sleepercdn.com/content/nfl/players/${id}.jpg`);

// The player as a trading card that flips to its stats, beside the CLT
// roster spot and the week-by-week the Player window shows.
export function BuzzPlayer({ params }: { params: WindowParams }) {
  const id = String(params.playerId ?? "");
  const [load, retry] = useLoad(() => loadPage(id), id);
  if (load.status === "loading") return <p role="status">Pulling the card from the pack...</p>;
  if (load.status === "error") return <LoadError what="the player from Sleeper" message={load.message} onRetry={retry} />;
  if (!load.value) return <p role="alert">Sleeper has no player {id}.</p>;
  const page = load.value;
  return (
    <div className="bz-player">
      <Card key={id} page={page} />
      <div className="bz-player-side">
        <InClt page={page} />
        <Weeks page={page} />
      </div>
    </div>
  );
}

function Card({ page }: { page: Page }) {
  const { player, data, weeks, bye } = page;
  const [flipped, setFlipped] = useState(false);
  const nfl = nflTeam(player.team ?? undefined);
  const name = playerTitle(player);
  const injury = injuryTag({ player_id: player.player_id, injury_status: player.injury_status ?? undefined });
  const injuryText = [player.injury_status, player.injury_body_part].filter(Boolean).join(", ");
  const exp = player.years_exp === 0 ? "Rookie" : player.years_exp ? `${player.years_exp} yr${player.years_exp === 1 ? "" : "s"}` : null;
  const bio: [string, string | number | null | undefined][] = [
    ["Pos", player.position],
    ["Age", player.age],
    ["Ht", player.height ? heightLabel(player.height) : null],
    ["Wt", player.weight ? `${player.weight} lb` : null],
    ["College", player.college],
    ["Exp", exp],
    ["Depth", player.depth_chart_order && player.position ? `${player.position}${player.depth_chart_order}` : null],
    ["Bye", bye ? `Week ${bye}` : null],
  ];

  return (
    <div className="bz-pcard-wrap">
      <div className="bz-pcard" data-flipped={flipped || undefined}>
        <section className="bz-pcard-face bz-pcard-front" aria-label={`${name}, front of card`} aria-hidden={flipped} inert={flipped}>
          <p className="bz-tcard-top">
            <span>CLT Dynasty</span>
            <span>{data.league.season} series</span>
          </p>
          <div className="bz-pcard-photo">
            {nfl && <Image src={nflLogo(nfl.abbr)} alt="" width={160} height={160} unoptimized className="bz-pcard-logo" />}
            <Portrait id={player.player_id} position={player.position} />
            <span className="bz-pos-sticker">{player.position ?? "FA"}</span>
            {player.number ? <span className="bz-pcard-number">#{player.number}</span> : null}
          </div>
          <h2 className="bz-pcard-name">
            <span>{player.first_name}</span> {player.last_name}
          </h2>
          <p className="bz-pcard-team">
            {player.team ? <NflTeamLink team={player.team} long /> : <span>Free agent</span>}
            {injury && (
              <span className="bz-injury" title={injuryText}>
                {injury}
                <span className="sr-only">, {injuryText}</span>
              </span>
            )}
          </p>
        </section>
        <section className="bz-pcard-face bz-pcard-back" aria-label={`${name}, back of card`} aria-hidden={!flipped} inert={!flipped}>
          <div className="bz-back-head">
            <span className="bz-back-num">{player.number ?? "-"}</span>
            <div className="min-w-0">
              <p className="bz-back-name">{name}</p>
              <dl className="bz-back-bio">
                {bio
                  .filter(([, v]) => v !== null && v !== undefined && v !== "")
                  .map(([label, v]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{v}</dd>
                    </div>
                  ))}
              </dl>
            </div>
          </div>
          <BackStats position={player.position} weeks={weeks} season={data.league.season} />
          <p className="bz-back-fact">
            <strong>Buzz fact</strong> {factFor(player.player_id)}
          </p>
        </section>
      </div>
      <button type="button" className="bz-sticker-btn bz-flip-btn" aria-pressed={flipped} onClick={() => setFlipped((f) => !f)}>
        {flipped ? "Show the front" : "Flip for stats"}
      </button>
    </div>
  );
}

function Portrait({ id, position }: { id: string; position: string | null }) {
  const src = portrait(id, position);
  const [failed, setFailed] = useState<string | null>(null);
  if (failed === src) return <SilhouetteIcon className="bz-pcard-face-img" width="70%" height="70%" />;
  return <Image src={src} alt="" width={480} height={350} unoptimized className="bz-pcard-face-img" onError={() => setFailed(src)} />;
}

interface BackStatsProps {
  position: string | null;
  weeks: Week[];
  season: string;
}

function BackStats({ position, weeks, season }: BackStatsProps) {
  const cols = COLUMNS[position ?? ""] ?? [];
  const sum = (f: (s: Stats) => number) => weeks.reduce((n, w) => n + (w.stats ? f(w.stats.stats) : 0), 0);
  const total = weeks.reduce((n, w) => n + (w.fantasy?.points ?? 0), 0);
  if (weeks.length === 0) return <p className="bz-back-empty">No {season} games yet.</p>;
  // A card back has room for six lines; the total still counts them all.
  const shown = weeks.slice(-6);
  return (
    <table className="bz-back-stats">
      <caption>
        {season}
        {shown.length < weeks.length ? `, last ${shown.length} weeks` : ""}
      </caption>
      <thead>
        <tr>
          <th scope="col">Wk</th>
          <th scope="col">Opp</th>
          {cols.map(([label]) => (
            <th key={label} scope="col">
              {label}
            </th>
          ))}
          <th scope="col">Pts</th>
        </tr>
      </thead>
      <tbody>
        {shown.map((w) => (
          <tr key={w.week}>
            <td>{w.week}</td>
            <td>{gameLabel(w.game) || "-"}</td>
            {cols.map(([label, f]) => (
              <td key={label}>{w.stats ? f(w.stats.stats) : "-"}</td>
            ))}
            <td>{w.fantasy ? w.fantasy.points.toFixed(1) : "-"}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr>
          <th scope="row" colSpan={2}>
            Season
          </th>
          {cols.map(([label, f]) => (
            <td key={label}>{sum(f)}</td>
          ))}
          <td>{total.toFixed(1)}</td>
        </tr>
      </tfoot>
    </table>
  );
}
