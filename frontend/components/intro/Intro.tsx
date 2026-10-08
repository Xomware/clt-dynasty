"use client";

import { type AnimationEvent, type CSSProperties, useEffect, useRef, useState } from "react";

import { BrandMark } from "@/components/buzz/BrandMark";
import { league, nflState, users } from "@/lib/league/cache";
import { teamAvatar } from "@/lib/league/use-league";
import { rememberedMe } from "@/lib/intro/me";
import { postChecks } from "@/lib/intro/post";
import { play } from "@/lib/sound/sound";
import type { SleeperLeague, SleeperNflState } from "@/lib/sleeper/types";
import { useStoredTheme } from "@/lib/theme/theme";
import { useIntro } from "./use-intro";

import "./intro.css";

interface Tile {
  id: string;
  name: string;
  avatar: string | null;
}

interface Booted {
  league?: SleeperLeague;
  nfl?: SleeperNflState;
  tiles?: Tile[];
  // How far into the intro the tiles mounted, so their slide-in keeps the intro's clock.
  late?: number;
}

// POST lines print from 0.62s, one every 0.11s; each check's value 0.07s after it.
const POST_AT = 620;
const POST_STEP = 110;

// A team picture appears only once decoded, or WebKit decodes it mid-slide.
function Picture({ tile }: { tile: Tile }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!tile.avatar) return;
    const img = new Image();
    img.src = tile.avatar;
    // A broken picture keeps the initial.
    img.decode().then(() => setReady(true), () => {});
  }, [tile.avatar]);
  return (
    <span className="xpi-pic">
      {ready && tile.avatar ? (
        // eslint-disable-next-line @next/next/no-img-element -- Sleeper's CDN picture, already decoded above.
        <img src={tile.avatar} alt="" />
      ) : (
        tile.name.charAt(0).toUpperCase()
      )}
    </span>
  );
}

// Windows XP coming up, server-rendered so its first frame paints before any
// JS: the CRT warms up on a POST screen that checks the league, the boot
// screen with the seal, then the Welcome screen as the league's teams sign
// in, yours lit. The CSS drives every beat; this decides when it goes, fills
// in the league's numbers and pictures as Sleeper answers, and chimes.
export function Intro() {
  const { shown, phase, skip, onAnimationStart, onAnimationEnd } = useIntro(useStoredTheme() !== "buzz", "xpi-exit", "xpi-exit");
  const [booted, setBooted] = useState<Booted>({});
  const [me] = useState(rememberedMe);
  const stage = useRef<HTMLDivElement>(null);

  const started = useRef(false);

  useEffect(() => {
    // The hydration pass renders it for everyone; the head scripts know better.
    const html = document.documentElement.dataset;
    if (!shown || started.current || html.intro === "skip" || html.theme === "buzz") return;
    started.current = true;
    // The page under it reads the same cache, so these are its requests, made early.
    // A failed one leaves the line's stock value.
    league().then((l) => setBooted((b) => ({ ...b, league: l })), () => {});
    nflState().then((n) => setBooted((b) => ({ ...b, nfl: n })), () => {});
    users().then(
      (list) => {
        const clock = stage.current?.getAnimations().find((a) => (a as CSSAnimation).animationName === "xpi-exit");
        const tiles = list
          .map((u) => ({ id: u.user_id, name: u.metadata?.team_name || u.display_name, avatar: teamAvatar(u) }))
          .sort((a, b) => a.name.localeCompare(b.name))
          .slice(0, 12);
        setBooted((b) => ({ ...b, tiles, late: Number(clock?.currentTime ?? 0) }));
      },
      () => {},
    );
  }, [shown]);

  // The desktop's icons pop in as the intro uncovers it.
  useEffect(() => {
    if (phase === "leave" || phase === "skip") document.documentElement.dataset.booted = "";
  }, [phase]);

  if (!shown) return null;

  const checks = postChecks(booted.league, booted.nfl);
  const season = booted.league?.season ?? booted.nfl?.season;
  const mine = booted.tiles?.find((t) => t.id === me);

  const onStart = (e: AnimationEvent) => {
    // The startup chime as the Welcome screen comes up. Browsers keep it
    // silent until the visitor has tapped or clicked, and mute wins.
    if (e.animationName === "xpi-welcome") play("startup");
    onAnimationStart(e);
  };

  const skipNow = () => {
    play("startup");
    skip();
  };

  return (
    // Skips on click, not pointerdown: a tap's click would otherwise land on
    // whatever the overlay was covering.
    <div ref={stage} className="intro" data-phase={phase} onClick={skipNow} onAnimationStart={onStart} onAnimationEnd={onAnimationEnd}>
      <div className="xpi-post" aria-hidden>
        <BrandMark mark="seal" alt="" className="xpi-post-seal" priority />
        <p style={{ "--at": "450ms" } as CSSProperties}>Queen City BIOS v{season ?? "2026"}, A Dynasty Ally</p>
        <p style={{ "--at": "520ms" } as CSSProperties}>Copyright (C) CLT Dynasty League</p>
        <ul>
          {checks.map((c, i) => (
            <li key={i} style={{ "--at": `${POST_AT + i * POST_STEP}ms` } as CSSProperties}>
              <span>{c.label}</span>
              <i />
              <b>{c.value}</b>
            </li>
          ))}
        </ul>
        <p className="xpi-post-hint" style={{ "--at": "450ms" } as CSSProperties}>
          Press <b>ESC</b> to skip
        </p>
      </div>

      <div className="xpi-boot" aria-hidden>
        <BrandMark mark="seal" alt="" className="xpi-boot-seal" priority />
        <p className="xpi-boot-name">
          <small>Queen City</small>
          <span>
            CLT Dynasty<sup>league</sup>
          </span>
        </p>
        <div className="xpi-boot-bar">
          <i />
        </div>
        <p className="xpi-boot-foot">Copyright &copy; CLT Dynasty League</p>
      </div>

      <div className="xpi-welcome" aria-hidden>
        <i className="xpi-band" />
        <div className="xpi-welcome-body">
          <i className="xpi-sweep" />
          <div className="xpi-welcome-text">
            <p className="xpi-welcome-word">welcome</p>
            {mine && <p className="xpi-welcome-mine">{mine.name}</p>}
          </div>
          {booted.tiles && (
            <ul className="xpi-tiles" style={{ "--late": `${booted.late ?? 0}ms` } as CSSProperties}>
              {booted.tiles.map((t, i) => (
                <li key={t.id} data-me={t === mine || undefined} style={{ "--i": i } as CSSProperties}>
                  <Picture tile={t} />
                  <span className="xpi-tile-name">{t.name}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <i className="xpi-band xpi-band-foot" />
      </div>

      <i className="xpi-crt" aria-hidden />

      <button
        type="button"
        className="intro-skip"
        onClick={(e) => {
          e.stopPropagation();
          skipNow();
        }}
      >
        Skip intro
      </button>
    </div>
  );
}
