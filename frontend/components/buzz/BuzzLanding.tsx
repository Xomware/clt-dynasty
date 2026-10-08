"use client";

import { type CSSProperties, Fragment, type ReactNode } from "react";

import type { LandingProps } from "@/components/landing/Landing";
import { FEATURES, FORMAT, GoogleMark } from "@/components/landing/landing-content";
import { Skeleton, Status } from "@/components/landing/LeagueLive";
import { useScrollIn } from "@/components/motion/use-scroll-in";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { LoadError } from "@/components/xp/LoadError";
import { refreshOverview, useOverview } from "@/lib/landing/overview";
import { BrandMark } from "./BrandMark";
import { BoardSeeds } from "./landing/BoardSeeds";
import { ChampionCards } from "./landing/ChampionCards";
import { TRIVIA } from "./trivia";

import "./buzz.css";
import "./buzz-skin.css";
import "./buzz-landing.css";

// Four of the trivia lines, each with its own sticker art.
const CHARLOTTE: { title: string; fact: string; art: ReactNode }[] = [
  {
    title: "The Hornet's Nest",
    fact: TRIVIA[0],
    art: <BrandMark mark="head" alt="" className="bz-about-mark" />,
  },
  {
    title: "Gold and the Mint",
    fact: TRIVIA[3],
    art: (
      <svg viewBox="0 0 64 64" className="bz-about-coin" aria-hidden="true" focusable="false">
        <circle cx="32" cy="32" r="28" />
        <circle cx="32" cy="32" r="21" />
        <path d="M32 17l4 9 10 1-7.5 6.6 2.1 9.8L32 38.4l-8.6 5 2.1-9.8L18 27l10-1z" />
      </svg>
    ),
  },
  {
    title: "Speedway country",
    fact: TRIVIA[5],
    art: (
      <svg viewBox="0 0 64 64" className="bz-about-flag" aria-hidden="true" focusable="false">
        <path d="M14 58V8" />
        <path d="M16 10h38v26H16z" />
        <path d="M16 10h9.5v6.5H16zM35 10h9.5v6.5H35zM25.5 16.5H35V23h-9.5zM44.5 16.5H54V23h-9.5zM16 23h9.5v6.5H16zM35 23h9.5v6.5H35zM25.5 29.5H35V36h-9.5zM44.5 29.5H54V36h-9.5z" />
      </svg>
    ),
  },
  {
    title: "Queen City",
    fact: TRIVIA[1],
    art: <BrandMark mark="crown" alt="" className="bz-about-mark" />,
  },
];

// The signed-out page in Buzz City: the league's lockup on the road jersey,
// the same facts and live Sleeper data as the XP landing on arena boards and
// trading cards, and a little Charlotte history. The hero's entrance waits for
// the first-load intro to leave; everything below the fold enters as it
// scrolls in (`data-scroll`).
export function BuzzLanding({ onSignIn }: LandingProps) {
  const state = useOverview();
  const { root, go } = useScrollIn<HTMLDivElement>();
  const o = state.status === "ok" ? state.overview : null;
  const live = (child: ReactNode, label: string, rows: number) =>
    state.status === "error" ? (
      <LoadError what="the league from Sleeper" message={state.message} onRetry={refreshOverview} />
    ) : o ? (
      child
    ) : (
      <Skeleton label={label} rows={rows} />
    );

  return (
    <div ref={root} className="buzz bz-landing" data-go={go || undefined}>
      <i className="bz-backdrop" aria-hidden />
      <i className="bz-sheen" aria-hidden />
      <div className="bz-flyby" aria-hidden>
        <div className="bz-flyby-y">
          <BrandMark mark="head" alt="" className="bz-flyby-head" priority />
        </div>
      </div>
      <header className="bz-header bz-landing-header">
        <BrandMark mark="seal" alt="" className="bz-landing-seal" priority />
        <ThemeToggle />
      </header>

      <main className="bz-landing-main">
        <section aria-label="Welcome" className="bz-landing-hero">
          <div className="bz-landing-intro">
            <p className="bz-tape">Charlotte, NC &middot; Est. 2024</p>
            <h1 className="bz-landing-title">
              <BrandMark mark="lockup" alt="CLT Dynasty Fantasy Football" className="bz-landing-lockup" priority />
              <i className="bz-landing-glint" aria-hidden />
            </h1>
          </div>
          <div className="bz-landing-side">
            <p className="bz-landing-lede">Standings, scores, drafts and rule proposals for the twelve teams of CLT Dynasty. Members only.</p>
            <ul className="bz-landing-chips" aria-label="Format">
              {["12 teams", "Superflex", "Full PPR"].map((chip, i) => (
                <li key={chip} style={{ "--i": i } as CSSProperties}>
                  {chip}
                </li>
              ))}
            </ul>
            <SignIn onSignIn={onSignIn} />
            <section aria-label="Tonight in the league" className="bz-landing-board">
              <i className="bz-bulbs" aria-hidden />
              <h2 className="bz-landing-board-title">Tonight in the league</h2>
              {live(o && <Status overview={o} />, "Loading league status", 4)}
            </section>
          </div>
        </section>

        <section aria-labelledby="bz-live" className="bz-landing-section">
          <h2 id="bz-live" className="bz-landing-heading" data-scroll>
            The league, live from Sleeper
          </h2>
          <div className="bz-landing-live">
            <section aria-label="Playoff picture" className="bz-landing-scoreboard" data-scroll>
              <h3 className="bz-landing-board-title">Playoff picture</h3>
              {live(o && <BoardSeeds overview={o} />, "Loading standings", 6)}
            </section>
            <section aria-label="Hall of champions" className="bz-landing-hall">
              <h3 className="bz-landing-hall-title">
                <BrandMark mark="football-hornet" alt="" className="bz-landing-hall-mark" />
                Hall of champions
              </h3>
              {live(o && <ChampionCards champions={o.champions} />, "Loading champions", 3)}
            </section>
          </div>
        </section>

        <section aria-labelledby="bz-inside" className="bz-landing-section">
          <div className="bz-landing-heading-row">
            <h2 id="bz-inside" className="bz-landing-heading" data-scroll>
              What&rsquo;s inside
            </h2>
            <BrandMark mark="pennant" alt="" className="bz-landing-pennant" />
          </div>
          <ul className="bz-landing-features" data-scroll>
            {FEATURES.map(({ name, Icon, about }, i) => (
              <li key={name} style={{ "--i": i } as CSSProperties}>
                <p className="bz-feature-top" aria-hidden="true">
                  <span>CLT Dynasty</span>
                  <span>#{String(i + 1).padStart(2, "0")}</span>
                </p>
                <span className="bz-feature-art">
                  <Icon width={44} height={44} />
                </span>
                <h3>{name}</h3>
                <p>{about}</p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="bz-about" className="bz-landing-section">
          <h2 id="bz-about" className="bz-landing-heading" data-scroll>
            About Charlotte
          </h2>
          <ul className="bz-about" data-scroll>
            {CHARLOTTE.map(({ title, fact, art }, i) => (
              <li key={title} style={{ "--i": i } as CSSProperties}>
                <span className="bz-about-art">{art}</span>
                <h3>{title}</h3>
                <p>{fact}</p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="bz-format" className="bz-landing-section">
          <h2 id="bz-format" className="bz-landing-heading" data-scroll>
            League format
          </h2>
          <div className="bz-landing-format-row">
            <section aria-label="The rulebook, short version" className="bz-card bz-landing-card" data-scroll>
              <h3 className="bz-card-title">The rulebook, short version</h3>
              <dl className="xp-summary bz-landing-format">
                {FORMAT.map(([k, v]) => (
                  <Fragment key={k}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </Fragment>
                ))}
              </dl>
            </section>
            <BrandMark mark="helmet" alt="" className="bz-landing-helmet" />
          </div>
        </section>
      </main>

      <footer className="bz-landing-footer">
        <BrandMark mark="badge-skyline" alt="" className="bz-landing-badge" />
        <h2>Ready to log on?</h2>
        <SignIn onSignIn={onSignIn} />
        <p>A private league site. Members sign in with Google.</p>
      </footer>
    </div>
  );
}

function SignIn({ onSignIn }: LandingProps) {
  return (
    <div className="bz-signin-wrap">
      <button type="button" className="bz-sticker-btn bz-signin" onClick={onSignIn} disabled={!onSignIn}>
        <span className="bz-signin-mark">
          <GoogleMark />
        </span>
        Sign in with Google
      </button>
      {!onSignIn && <p role="alert">Sign-in isn&rsquo;t set up in this build.</p>}
    </div>
  );
}
