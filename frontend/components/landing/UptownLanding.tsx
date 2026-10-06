"use client";

import { Fragment, type ReactNode } from "react";

import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Backdrop } from "@/components/uptown/Backdrop";
import { LoadError } from "@/components/xp/LoadError";
import { CrownIcon } from "@/components/xp/icons";
import { refreshOverview, useOverview } from "@/lib/landing/overview";
import type { LandingProps } from "./Landing";
import { FEATURES, FORMAT, GoogleMark } from "./landing-content";
import { Champions, Seeds, Skeleton, Status } from "./LeagueLive";

import "@/components/uptown/uptown.css";
import "@/components/uptown/uptown-skin.css";
import "./uptown-landing.css";

// The signed-out page in Uptown: the same facts and live Sleeper data as the
// XP landing, under the night skyline.
export function UptownLanding({ onSignIn }: LandingProps) {
  const state = useOverview();
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
    <div className="uptown ul">
      <Backdrop />
      <header className="ul-header">
        <span className="u-brand">
          <CrownIcon width={34} height={34} />
          <span>CLT Dynasty</span>
        </span>
        <ThemeToggle />
      </header>

      <main className="ul-main">
        <section aria-label="Welcome" className="ul-hero">
          <div className="ul-hero-copy">
            <p className="ul-kicker">Charlotte, NC &middot; Est. 2024</p>
            <h1 className="ul-title">
              The Queen City&rsquo;s <span>dynasty league</span>
            </h1>
            <p className="ul-lede">Standings, scores, drafts and rule proposals for the twelve teams of CLT Dynasty. Members only.</p>
            <ul className="ul-chips" aria-label="Format">
              <li>12 teams</li>
              <li>Superflex</li>
              <li>Full PPR</li>
            </ul>
            <SignIn onSignIn={onSignIn} />
          </div>
          <Card title="Tonight in the league" className="ul-status">
            {live(o && <Status overview={o} />, "Loading league status", 4)}
          </Card>
        </section>

        <section aria-labelledby="ul-live" className="ul-section">
          <h2 id="ul-live" className="ul-heading">
            The league, live from Sleeper
          </h2>
          <div className="ul-live">
            <Card title="Playoff picture">{live(o && <Seeds overview={o} />, "Loading standings", 6)}</Card>
            <Card title="Hall of champions">{live(o && <Champions overview={o} />, "Loading champions", 3)}</Card>
          </div>
        </section>

        <section aria-labelledby="ul-inside" className="ul-section">
          <h2 id="ul-inside" className="ul-heading">
            What&rsquo;s inside
          </h2>
          <ul className="ul-features">
            {FEATURES.map(({ name, about }) => (
              <li key={name}>
                <h3>{name}</h3>
                <p>{about}</p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="ul-format" className="ul-section ul-format-row">
          <h2 id="ul-format" className="ul-heading">
            League format
          </h2>
          <Card title="The rulebook, short version">
            <dl className="xp-summary ul-format">
              {FORMAT.map(([k, v]) => (
                <Fragment key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </Fragment>
              ))}
            </dl>
          </Card>
        </section>
      </main>

      <footer className="ul-footer">
        <h2 className="ul-footer-title">Ready to log on?</h2>
        <SignIn onSignIn={onSignIn} />
        <p className="u-quiet">A private league site. Members sign in with Google.</p>
      </footer>
    </div>
  );
}

function Card({ title, className = "", children }: { title: string; className?: string; children: ReactNode }) {
  return (
    <section aria-label={title} className={`ul-card ${className}`}>
      <h3 className="ul-card-title">{title}</h3>
      {children}
    </section>
  );
}

function SignIn({ onSignIn }: LandingProps) {
  return (
    <div className="ul-signin-wrap">
      <button type="button" className="ul-signin" onClick={onSignIn} disabled={!onSignIn}>
        <span className="ul-signin-mark">
          <GoogleMark />
        </span>
        Sign in with Google
      </button>
      {!onSignIn && <p role="alert">Sign-in isn&rsquo;t set up in this build.</p>}
    </div>
  );
}
