"use client";

import { Fragment } from "react";

import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { Window } from "@/components/xp/Window";
import { CrownIcon, FolderIcon, InfoIcon } from "@/components/xp/icons";
import { useTheme } from "@/lib/theme/theme";
import { FEATURES, FORMAT, GoogleMark } from "./landing-content";
import { LeagueLive } from "./LeagueLive";
import { UptownLanding } from "./UptownLanding";

import "@/components/auth/logon.css";
import "./landing.css";

export interface LandingProps {
  // Absent when this build has no Cognito client id, which leaves sign-in disabled.
  onSignIn?: () => void;
}

export function Landing(props: LandingProps) {
  return useTheme().theme === "buzz" ? <UptownLanding {...props} /> : <XpLanding {...props} />;
}

function XpLanding({ onSignIn }: LandingProps) {
  return (
    <div className="landing">
      <main>
        <section aria-label="Welcome" className="xp-logon landing-hero">
          <div className="xp-logon-band landing-hero-top">
            <span className="landing-hero-badge">
              <CrownIcon width={20} height={20} />
              Charlotte, NC
            </span>
            <span className="landing-hero-end">
              <span className="landing-hero-year">Est. 2024</span>
              <ThemeToggle />
            </span>
          </div>
          <div className="xp-logon-body">
            <div className="xp-logon-brand">
              <CrownIcon width={96} height={96} />
              <h1 className="xp-logon-name">CLT Dynasty</h1>
              <p className="xp-logon-tagline">The Queen City&rsquo;s dynasty league</p>
              <p className="landing-hero-format">12 teams &middot; Superflex &middot; Full PPR</p>
            </div>
            <div className="xp-logon-panel">
              <h2>To begin, sign in</h2>
              <SignInTile onSignIn={onSignIn} />
              <p className="text-sm">Members only. Google tells the site which roster spot is yours.</p>
              <a href="#the-league" className="landing-cue">
                See what&rsquo;s inside
                <ChevronIcon />
              </a>
            </div>
          </div>
          <div className="xp-logon-band xp-logon-foot">
            <span>A private league site. Members sign in with Google.</span>
          </div>
        </section>

        <section id="the-league" aria-labelledby="live-heading" className="landing-desk">
          <h2 id="live-heading" className="landing-desk-label">
            The league, live from Sleeper
          </h2>
          <LeagueLive />
        </section>

        <section aria-labelledby="inside-heading" className="landing-band">
          <Window title="C:\CLT Dynasty" icon={<FolderIcon width={16} height={16} />} controls className="landing-explorer">
            <div className="landing-explorer-bar" aria-hidden>
              <span>File</span>
              <span>Edit</span>
              <span>View</span>
              <span>Help</span>
            </div>
            <h2 id="inside-heading" className="xp-group-title mt-3">
              What&rsquo;s inside
            </h2>
            <ul className="landing-features">
              {FEATURES.map(({ name, Icon, about }) => (
                <li key={name}>
                  <Icon width={32} height={32} />
                  <span>
                    <strong>{name}</strong>
                    <span className="block">{about}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Window>

          <Window title="League Properties" icon={<InfoIcon width={16} height={16} />} className="landing-properties">
            <div className="landing-tabs" aria-hidden>
              <span>General</span>
            </div>
            <div className="xp-inset p-3">
              <dl className="xp-summary landing-format">
                {FORMAT.map(([k, v]) => (
                  <Fragment key={k}>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </Fragment>
                ))}
              </dl>
            </div>
          </Window>
        </section>

        <section aria-labelledby="cta-heading" className="landing-cta">
          <h2 id="cta-heading" className="xp-logon-name">
            Ready to log on?
          </h2>
          <SignInTile onSignIn={onSignIn} />
        </section>
      </main>

      <footer className="landing-taskbar">
        <span className="landing-taskbar-start">
          <CrownIcon width={18} height={18} />
          CLT Dynasty
        </span>
        <span className="landing-taskbar-tray">
          A private league site.{" "}
          {/* CC BY-SA 3.0 requires credit for the wallpaper photo. */}
          <a href="https://commons.wikimedia.org/wiki/File:A_hill_covered_with_green_grass.jpg" target="_blank" rel="noreferrer">
            Wallpaper: arifovic Jelic Zora, CC BY-SA 3.0
          </a>
        </span>
      </footer>
    </div>
  );
}

function SignInTile({ onSignIn }: LandingProps) {
  return (
    <div className="flex flex-col items-start gap-2">
      <button type="button" className="xp-user-tile" onClick={onSignIn} disabled={!onSignIn}>
        <span className="xp-user-tile-picture">
          <GoogleMark />
        </span>
        Sign in with Google
      </button>
      {!onSignIn && <p role="alert">Sign-in isn&rsquo;t set up in this build.</p>}
    </div>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" width={24} height={24} aria-hidden focusable="false" className="landing-cue-chevron">
      <path d="M5 8l7 7 7-7" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
