"use client";

import { type MouseEvent, useCallback, useId, useLayoutEffect, useRef, useState } from "react";

import { WindowBoundary } from "@/components/desktop/DesktopWindow";
import { REVEAL, useReveal } from "@/components/motion/use-reveal";
import { TeamAvatar } from "@/components/xp/TeamAvatar";
import { AccountNav } from "./AccountNav";
import { LINE, LineIcon } from "./line-icons";
import { MoreNav } from "./MoreNav";
import { Related } from "./Related";
import { Sheet } from "./Sheet";
import { Spotlight } from "./Spotlight";
import type { WindowLink } from "@/lib/desktop/deep-link";
import { DrillContext, NavigateContext } from "@/lib/desktop/navigation";
import { REGISTRY, useLaunchers, useWindowTitle } from "@/lib/desktop/registry";
import { viewKey, type WindowParams } from "@/lib/desktop/windows";
import { useLeague } from "@/lib/league/use-league";
import { useMember } from "@/lib/member/use-member";
import { ViewLabelContext } from "@/lib/nav/label";
import { useOpeners } from "@/lib/nav/openers";
import { useEdgeSwipe } from "@/lib/phone/use-edge-swipe";
import { useHideOnScroll } from "@/lib/phone/use-hide-on-scroll";
import { PHONE_KEEP, usePhoneStack } from "@/lib/phone/use-phone-stack";
import { ViewParamsContext } from "@/lib/view-params";
import { BODIES } from "./bodies";
import { BrandMark } from "./BrandMark";
import { BuzzHome } from "./BuzzHome";

import "./buzz.css";
import "./buzz-skin.css";

const TABS: { link: WindowLink; label: string; d: string }[] = [
  { link: { kind: "home", params: {} }, label: "Home", d: LINE.home },
  { link: { kind: "scores", params: {} }, label: "Scores", d: LINE.scores },
  { link: { kind: "standings", params: {} }, label: "Standings", d: LINE.standings },
  { link: { kind: "players", params: {} }, label: "Players", d: LINE.player },
];

type SheetName = "more" | "account";

// Buzz City on a phone: Home under a short arena bar, every other page stacked
// over it with Back in the bar, four destinations and More on a tab bar, the
// groups in More's sheet and the member's own pages in the account sheet. Both
// bars slide away while the page scrolls down. Same stack and history as the XP phone.
export function BuzzPhone() {
  const { stack, top, open, back, patch, home, setLabel, labelAt } = usePhoneStack();
  const [sheet, setSheet] = useState<SheetName | null>(null);
  // What the sheet holds, kept while it slides away closed.
  const [held, setHeld] = useState<SheetName>("more");
  const [searching, setSearching] = useState(false);
  const { state } = useMember();
  const { teamFor, myRosterId } = useLeague();
  const name = state.status === "member" ? state.me.member.displayName : "";
  const windowTitle = useWindowTitle();
  const launchers = useLaunchers();
  const heading = useRef<HTMLHeadingElement>(null);
  const shown = useRef(stack.length);
  const main = useReveal<HTMLElement>(REVEAL);
  const openers = useOpeners(main);
  // A push slides the new screen in from the right; Back brings the last one in from the left.
  const [depth, setDepth] = useState({ at: stack.length, dir: "in" });
  if (depth.at !== stack.length) setDepth({ at: stack.length, dir: stack.length > depth.at ? "next" : "back" });
  const sheetId = useId();
  // The bar is narrow, so it names what the screen shows: the team, not "Team Profile - team".
  const title = top ? labelAt(stack.length) : "CLT Dynasty";
  const current = top?.kind ?? "home";
  const tabs = TABS.filter((t) => t.link.kind === "home" || launchers.some((l) => l.kind === t.link.kind));
  // A page off the tab bar files under More.
  const onTab = tabs.some((t) => t.link.kind === current);
  const backTo = labelAt(stack.length - 1);
  const tucked = useHideOnScroll(stack.length) && !sheet && !searching;
  useEdgeSwipe(main, stack.length, back);

  // The tapped link went with the old screen, so the new title takes focus.
  // Back hands it to the link that opened the screen it left.
  useLayoutEffect(() => {
    if (shown.current === stack.length) return;
    const back = stack.length < shown.current;
    shown.current = stack.length;
    if (back) openers.focus(stack.length, heading.current);
    else heading.current?.focus({ preventScroll: true });
  }, [stack.length, openers]);

  const go = (to: WindowLink) => {
    if (to.kind === top?.kind && viewKey(to.kind, to.params) === viewKey(top.kind, top.params)) return;
    openers.leave(stack.length);
    open(to);
  };
  const toTab = (to: WindowLink) => (to.kind === "home" ? home() : go(to));
  const show = (which: SheetName) => {
    setHeld(which);
    setSheet(which);
  };
  const fromSheet = (to: WindowLink) => {
    setSheet(null);
    toTab(to);
  };
  // Safari never focuses a tapped button, and the sheets and Spotlight hand focus back to it.
  const opener = (run: () => void) => (e: MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.focus();
    run();
  };
  const kept = stack.map((view, i) => ({ view, at: i + 1 })).slice(-PHONE_KEEP);

  return (
    <div className="buzz bz-phone">
      <i className="bz-backdrop" aria-hidden />
      <div className="bz-phone-top" data-tucked={tucked || undefined}>
        <header className="bz-bar">
          {top ? (
            <button type="button" className="bz-bar-back" onClick={back}>
              <LineIcon d={LINE.back} size={20} />
              {/* The space outside the spans: a name trims each child's text. */}
              <span className="sr-only">Back to</span> <span className="truncate">{backTo}</span>
            </button>
          ) : (
            <button type="button" className="bz-bar-home" aria-label="CLT Dynasty, home" onClick={home}>
              <BrandMark mark="monogram" alt="" className="bz-bar-mark" priority />
            </button>
          )}
          <h1 ref={heading} tabIndex={-1} className="bz-bar-title">
            {title}
          </h1>
          <button type="button" className="bz-icon" aria-label="Search" onClick={opener(() => setSearching(true))}>
            <LineIcon d={LINE.search} />
          </button>
          <button
            type="button"
            className="bz-icon bz-account"
            aria-label="Account"
            aria-haspopup="dialog"
            aria-expanded={sheet === "account"}
            aria-controls={sheetId}
            onClick={opener(() => show("account"))}
          >
            <TeamAvatar name={name || "Account"} url={myRosterId === null ? null : teamFor(myRosterId).avatarUrl} size={30} className="u-avatar" />
          </button>
        </header>
      </div>
      <DrillContext value={go}>
        <NavigateContext value={go}>
          <main ref={main} className="bz-screen">
            <div className="bz-route" data-dir={depth.dir} data-restored={(top === undefined && depth.dir === "back") || undefined} hidden={top !== undefined}>
              <WindowBoundary>
                <BuzzHome phone />
              </WindowBoundary>
            </div>
            {kept.map(({ view, at }) => (
              <PhoneScreen
                key={`${at}:${viewKey(view.kind, view.params)}`}
                view={view}
                at={at}
                current={at === stack.length}
                dir={depth.dir}
                title={windowTitle(view)}
                onPatch={patch}
                onNav={go}
                setLabel={setLabel}
              />
            ))}
          </main>
        </NavigateContext>
      </DrillContext>
      <nav aria-label="Primary" className="bz-dock" data-tucked={tucked || undefined}>
        {tabs.map((t) => (
          <button
            key={t.label}
            type="button"
            aria-current={t.link.kind === current && !sheet ? "page" : undefined}
            onClick={() => toTab(t.link)}
          >
            <LineIcon d={t.d} size={22} />
            <span>{t.label}</span>
          </button>
        ))}
        <button
          type="button"
          aria-current={(!onTab && !sheet) || sheet === "more" ? "page" : undefined}
          aria-haspopup="dialog"
          aria-expanded={sheet === "more"}
          aria-controls={sheetId}
          onClick={opener(() => show("more"))}
        >
          <LineIcon d={LINE.more} size={22} />
          <span>More</span>
        </button>
      </nav>
      {searching && <Spotlight onClose={() => setSearching(false)} onGo={go} />}
      <Sheet id={sheetId} label={held === "account" ? "Account" : "More"} open={sheet !== null} onClose={() => setSheet(null)}>
        {held === "account" ? <AccountNav current={top} onGo={fromSheet} /> : <MoreNav current={top} onGo={fromSheet} />}
      </Sheet>
    </div>
  );
}

interface PhoneScreenProps {
  view: WindowLink;
  at: number;
  current: boolean;
  dir: string;
  title: string;
  onPatch: (params: WindowParams) => void;
  onNav: (to: WindowLink) => void;
  setLabel: (depth: number, label: string | null) => void;
}

// One screen of the stack. The ones under the top stay mounted but hidden, so
// Back shows them as they were left.
function PhoneScreen({ view, at, current, dir, title, onPatch, onNav, setLabel }: PhoneScreenProps) {
  const Page = BODIES[view.kind] ?? REGISTRY[view.kind].component;
  const label = useCallback((l: string | null) => setLabel(at, l), [at, setLabel]);
  return (
    <div className="bz-route" data-dir={dir} data-restored={(current && dir === "back") || undefined} hidden={!current}>
      <ViewLabelContext value={label}>
        <section aria-label={title} className="bz-panel" data-kind={view.kind}>
          <WindowBoundary>
            <ViewParamsContext value={current ? onPatch : ignore}>
              <Page params={view.params} />
            </ViewParamsContext>
          </WindowBoundary>
        </section>
      </ViewLabelContext>
      <Related
        kind={view.kind}
        onNav={(e, to) => {
          e.preventDefault();
          onNav(to);
        }}
      />
    </div>
  );
}

// A screen under the top one never changes its own link.
const ignore = () => {};
