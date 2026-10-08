"use client";

import { type MouseEvent, type ReactNode, useCallback, useId, useLayoutEffect, useRef, useState } from "react";

import { WindowBoundary } from "@/components/desktop/DesktopWindow";
import { REVEAL, useReveal } from "@/components/motion/use-reveal";
import { DrawerNav } from "./DrawerNav";
import { LINE, LineIcon } from "./line-icons";
import { MenuDrawer } from "./MenuDrawer";
import { Related } from "./Related";
import { Spotlight } from "./Spotlight";
import type { WindowLink } from "@/lib/desktop/deep-link";
import { DrillContext, NavigateContext } from "@/lib/desktop/navigation";
import { REGISTRY, useLaunchers, useWindowTitle } from "@/lib/desktop/registry";
import { viewKey, windowId, type WindowParams } from "@/lib/desktop/windows";
import { ViewLabelContext } from "@/lib/nav/label";
import { useOpeners } from "@/lib/nav/openers";
import { useEdgeSwipe } from "@/lib/phone/use-edge-swipe";
import { PHONE_KEEP, usePhoneStack } from "@/lib/phone/use-phone-stack";
import { ViewParamsContext } from "@/lib/view-params";
import { BODIES } from "./bodies";
import { BrandMark } from "./BrandMark";
import { BuzzHome } from "./BuzzHome";
import { BuzzTicker } from "./BuzzTicker";
import { type Crumb, Crumbs } from "./Crumbs";

import "./buzz.css";
import "./buzz-skin.css";

const TABS = [
  { kind: "home", label: "Home", d: LINE.home },
  { kind: "scores", label: "Scores", d: LINE.scores },
  { kind: "standings", label: "Standings", d: LINE.standings },
  { kind: "playoffs", label: "Playoffs", d: LINE.bracket },
  { kind: "my-team", label: "My Team", d: LINE.star },
] as const;

// Buzz City on a phone: Home under a short arena bar, every other page stacked
// over it, the weekly pages on a tab bar and the groups in a menu drawer. Same
// stack and history as the XP phone.
export function BuzzPhone() {
  const { stack, top, open, back, patch, home, unwind, setLabel, labelAt } = usePhoneStack();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const windowTitle = useWindowTitle();
  const launchers = useLaunchers();
  const heading = useRef<HTMLHeadingElement>(null);
  const shown = useRef(stack.length);
  const main = useReveal<HTMLElement>(REVEAL);
  const openers = useOpeners(main);
  // A push slides the new screen in from the right; Back brings the last one in from the left.
  const [depth, setDepth] = useState({ at: stack.length, dir: "in" });
  if (depth.at !== stack.length) setDepth({ at: stack.length, dir: stack.length > depth.at ? "next" : "back" });
  const drawerId = useId();
  // The bar is narrow, so it names what the screen shows: the team, not "Team Profile - team".
  const title = top ? labelAt(stack.length) : "CLT Dynasty";
  const current = top?.kind ?? "home";
  const tabs = TABS.filter((t) => t.kind === "home" || launchers.some((l) => l.kind === t.kind));
  const backTo = labelAt(stack.length - 1);
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
  const fromMenu = (to: WindowLink) => {
    setMenuOpen(false);
    toTab(to);
  };
  // Safari never focuses a tapped button, and the drawer and Spotlight hand focus back to it.
  const opener = (show: () => void) => (e: MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.focus();
    show();
  };
  // The screens behind this one. Three deep or more, the path sits over the
  // page too, Home first; the Back label covers anything shallower.
  const crumbs: Crumb[] = stack.slice(0, -1).map((v, i) => ({ label: labelAt(i + 1), href: `/?open=${windowId(v.kind, v.params)}`, onSelect: () => unwind(i + 1) }));
  const kept = stack.map((view, i) => ({ view, at: i + 1 })).slice(-PHONE_KEEP);

  return (
    <div className="buzz bz-phone">
      <i className="bz-backdrop" aria-hidden />
      <header className="bz-bar">
        {top ? (
          <button type="button" className="bz-bar-back" onClick={back}>
            <LineIcon d={LINE.back} size={22} />
            {/* The space outside the spans: a name trims each child's text. */}
            <span className="sr-only">Back to</span> <span className="truncate">{backTo}</span>
          </button>
        ) : (
          <BrandMark mark="monogram" alt="" className="bz-bar-mark" priority />
        )}
        <h1 ref={heading} tabIndex={-1} className="bz-bar-title">
          {title}
        </h1>
        <button type="button" className="bz-icon" aria-label="Search" onClick={opener(() => setSearching(true))}>
          <LineIcon d={LINE.search} />
        </button>
        <button
          type="button"
          className="bz-icon"
          aria-label="Menu"
          aria-haspopup="dialog"
          aria-expanded={menuOpen}
          aria-controls={drawerId}
          onClick={opener(() => setMenuOpen(true))}
        >
          <LineIcon d={LINE.menu} />
        </button>
      </header>
      <DrillContext value={go}>
        {!top && <BuzzTicker />}
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
                crumbs={crumbs.length > 1 ? <Crumbs items={[{ label: "Home", href: "/", onSelect: home }, ...crumbs]} here={labelAt(at)} className="bz-crumbs-phone" /> : null}
                onPatch={patch}
                onNav={go}
                setLabel={setLabel}
              />
            ))}
          </main>
        </NavigateContext>
      </DrillContext>
      <nav aria-label="Quick" className="bz-dock">
        {tabs.map((t) => (
          <button
            key={t.kind}
            type="button"
            aria-current={t.kind === current ? "page" : undefined}
            onClick={() => toTab({ kind: t.kind, params: {} })}
          >
            <LineIcon d={t.d} size={22} />
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
      {searching && <Spotlight onClose={() => setSearching(false)} onGo={go} />}
      <MenuDrawer id={drawerId} open={menuOpen} onClose={() => setMenuOpen(false)}>
        <DrawerNav current={top} onGo={fromMenu} />
      </MenuDrawer>
    </div>
  );
}

interface PhoneScreenProps {
  view: WindowLink;
  at: number;
  current: boolean;
  dir: string;
  title: string;
  crumbs: ReactNode;
  onPatch: (params: WindowParams) => void;
  onNav: (to: WindowLink) => void;
  setLabel: (depth: number, label: string | null) => void;
}

// One screen of the stack. The ones under the top stay mounted but hidden, so
// Back shows them as they were left.
function PhoneScreen({ view, at, current, dir, title, crumbs, onPatch, onNav, setLabel }: PhoneScreenProps) {
  const Page = BODIES[view.kind] ?? REGISTRY[view.kind].component;
  const label = useCallback((l: string | null) => setLabel(at, l), [at, setLabel]);
  return (
    <div className="bz-route" data-dir={dir} data-restored={(current && dir === "back") || undefined} hidden={!current}>
      {current && crumbs}
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
