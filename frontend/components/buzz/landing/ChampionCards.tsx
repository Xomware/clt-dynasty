"use client";

import { type CSSProperties, type PointerEvent, useState } from "react";

import { BrandMark } from "@/components/buzz/BrandMark";
import { TeamAvatar } from "@/components/xp/TeamAvatar";
import type { Champion } from "@/lib/landing/overview";

interface CardProps {
  champ: Champion;
  reigning: boolean;
  i: number;
}

// Leans toward a mouse, like a card tipped in the hand. Touch has no hover, so
// it only flips.
function tilt(e: PointerEvent<HTMLButtonElement>) {
  if (e.pointerType !== "mouse") return;
  const r = e.currentTarget.getBoundingClientRect();
  const x = (e.clientX - r.left) / r.width - 0.5;
  const y = (e.clientY - r.top) / r.height - 0.5;
  e.currentTarget.style.setProperty("--ry", `${(x * 14).toFixed(2)}deg`);
  e.currentTarget.style.setProperty("--rx", `${(y * -12).toFixed(2)}deg`);
  e.currentTarget.style.setProperty("--shine", `${((x + 0.5) * 100).toFixed(1)}%`);
}

function untilt(e: PointerEvent<HTMLButtonElement>) {
  for (const p of ["--rx", "--ry", "--shine"]) e.currentTarget.style.removeProperty(p);
}

function Card({ champ, reigning, i }: CardProps) {
  const [back, setBack] = useState(false);
  const { season, champion, runnerUp } = champ;
  return (
    <li data-scroll style={{ "--i": i } as CSSProperties}>
      <button
        type="button"
        className="bz-champ"
        data-reigning={reigning || undefined}
        data-back={back || undefined}
        aria-pressed={back}
        aria-label={`${season} champion: ${champion.name}${runnerUp ? `, beat ${runnerUp.name} in the final` : ""}. Flip the card`}
        onClick={() => setBack((b) => !b)}
        onPointerMove={tilt}
        onPointerLeave={untilt}
      >
        <span className="bz-champ-flip" aria-hidden>
          <span className="bz-champ-face bz-champ-front">
            <span className="bz-champ-year">{season}</span>
            <TeamAvatar name={champion.name} url={champion.avatarUrl} size={112} className="bz-champ-avatar" />
            <span className="bz-champ-name">{champion.name}</span>
            <span className="bz-champ-tag">{reigning ? "Reigning champ" : "Champion"}</span>
          </span>
          <span className="bz-champ-face bz-champ-back">
            <BrandMark mark="head-crowned" alt="" className="bz-champ-mark" />
            <span className="bz-champ-stat">
              <span>Season</span>
              {season}
            </span>
            <span className="bz-champ-stat">
              <span>Final</span>
              {runnerUp ? `Beat ${runnerUp.name}` : "Won it all"}
            </span>
            <span className="bz-champ-brand">CLT Dynasty</span>
          </span>
        </span>
      </button>
    </li>
  );
}

/** The hall of champions as trading cards: dealt face down, flipped up as they scroll in, tap to see the back. */
export function ChampionCards({ champions }: { champions: Champion[] }) {
  if (champions.length === 0) return <p>No season has finished yet. The first banner is still up for grabs.</p>;
  return (
    <ol className="bz-champs" aria-label="Champions by season">
      {champions.map((c, i) => (
        <Card key={c.season} champ={c} reigning={i === 0} i={i} />
      ))}
    </ol>
  );
}
