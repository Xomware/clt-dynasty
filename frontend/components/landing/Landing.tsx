import { Fragment, type ComponentType, type SVGProps } from "react";

import { Window } from "@/components/xp/Window";
import {
  BallotIcon,
  BracketIcon,
  CalendarIcon,
  CrownIcon,
  FolderIcon,
  InfoIcon,
  NewsFeedIcon,
  ScoresIcon,
  StandingsIcon,
  TaxiIcon,
  TradeIcon,
  TrophyIcon,
} from "@/components/xp/icons";
import { LeagueLive } from "./LeagueLive";

import "@/components/auth/logon.css";
import "./landing.css";

interface LandingProps {
  // Absent when this build has no Cognito client id, which leaves sign-in disabled.
  onSignIn?: () => void;
}

interface Feature {
  name: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  about: string;
}

const FEATURES: Feature[] = [
  { name: "Standings", Icon: StandingsIcon, about: "Records, points for and the BIG10, SEC and ACC division races." },
  { name: "Scores", Icon: ScoresIcon, about: "Every matchup, live on game days, with full lineups." },
  { name: "Playoffs", Icon: BracketIcon, about: "The six-team bracket, projected from the standings all season." },
  { name: "World Cup", Icon: TrophyIcon, about: "The league inside the league: divisional games only." },
  { name: "Rule Proposals", Icon: BallotIcon, about: "Pitch a rule change and vote on everyone else's." },
  { name: "Taxi Squads", Icon: TaxiIcon, about: "Every taxi squad, and steal requests with pick compensation." },
  { name: "AI Review", Icon: NewsFeedIcon, about: "Weekly league recaps, written by AI." },
  { name: "Team Analyzer", Icon: TradeIcon, about: "Roster value by position from dynasty superflex values." },
  { name: "History", Icon: CalendarIcon, about: "Champions, finishes and head-to-head records since 2024." },
  { name: "Drafts", Icon: FolderIcon, about: "Every draft board and next year's order, traded picks included." },
];

// The rulebook's format, so it renders when Sleeper doesn't answer.
const FORMAT: [string, string][] = [
  ["Teams", "12, in three divisions"],
  ["Lineup", "QB, 2 RB, 2 WR, TE, 2 FLEX, SUPERFLEX"],
  ["Scoring", "Full PPR, 1.5 per TE catch"],
  ["Rosters", "26 active, 4 taxi, 8 IR"],
  ["Playoffs", "6 teams, weeks 15 to 17"],
  ["Rookie draft", "5 rounds, last place picks first"],
];

export function Landing({ onSignIn }: LandingProps) {
  return (
    <div className="landing">
      <main>
        <section aria-label="Welcome" className="xp-logon landing-hero">
          <div className="xp-logon-band landing-hero-top">
            <span className="landing-hero-badge">
              <CrownIcon width={20} height={20} />
              Charlotte, NC
            </span>
            <span>Est. 2024</span>
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

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" width={32} height={32} aria-hidden="true" focusable="false">
      <path fill="#ea4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.6 13.3l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
      <path fill="#4285f4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 7l7.4 5.7c4.3-4 6.9-9.9 6.9-17.2z" />
      <path fill="#fbbc05" d="M10.5 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C1 16.5 0 20.1 0 24s1 7.5 2.6 10.7l7.9-6.1z" />
      <path fill="#34a853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2.1 1.4-4.8 2.3-8.5 2.3-6.3 0-11.6-4.1-13.5-9.9l-7.9 6.1C6.6 42.6 14.6 48 24 48z" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" width={24} height={24} aria-hidden focusable="false" className="landing-cue-chevron">
      <path d="M5 8l7 7 7-7" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
