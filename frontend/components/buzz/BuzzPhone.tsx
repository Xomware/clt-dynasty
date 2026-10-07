"use client";

import { type MouseEvent, useEffect, useId, useRef, useState } from "react";

import { WindowBoundary } from "@/components/desktop/DesktopWindow";
import { REVEAL, useReveal } from "@/components/motion/use-reveal";
import { DrawerNav } from "@/components/uptown/DrawerNav";
import { LINE, LineIcon } from "@/components/uptown/icons";
import { MenuDrawer } from "@/components/uptown/MenuDrawer";
import { Related } from "@/components/uptown/Related";
import { Spotlight } from "@/components/uptown/Spotlight";
import type { WindowLink } from "@/lib/desktop/deep-link";
import { DrillContext, NavigateContext } from "@/lib/desktop/navigation";
import { REGISTRY, useLaunchers, useWindowTitle } from "@/lib/desktop/registry";
import { viewKey } from "@/lib/desktop/windows";
import { usePhoneStack } from "@/lib/phone/use-phone-stack";
import { ViewParamsContext } from "@/lib/view-params";
import { BODIES, HOME_PAGE } from "./bodies";
import { BuzzTicker } from "./BuzzTicker";
import { Hornet } from "./Hornet";

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
  const { stack, top, open, back, patch, home } = usePhoneStack();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const windowTitle = useWindowTitle();
  const launchers = useLaunchers();
  const heading = useRef<HTMLHeadingElement>(null);
  const shown = useRef(stack.length);
  const main = useReveal<HTMLElement>(REVEAL);
  // A push slides the new screen in from the right; Back brings the last one in from the left.
  const [depth, setDepth] = useState({ at: stack.length, dir: "in" });
  if (depth.at !== stack.length) setDepth({ at: stack.length, dir: stack.length > depth.at ? "next" : "back" });
  const drawerId = useId();
  const title = top ? windowTitle(top) : "CLT Dynasty";
  const Page = top ? (BODIES[top.kind] ?? REGISTRY[top.kind].component) : null;
  const current = top?.kind ?? "home";
  const tabs = TABS.filter((t) => t.kind === "home" || launchers.some((l) => l.kind === t.kind));

  // The tapped link went with the old screen, so the new title takes focus.
  useEffect(() => {
    if (shown.current === stack.length) return;
    shown.current = stack.length;
    heading.current?.focus({ preventScroll: true });
  }, [stack.length]);

  const go = (to: WindowLink) => {
    if (to.kind === top?.kind && viewKey(to.kind, to.params) === viewKey(top.kind, top.params)) return;
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

  return (
    <div className="buzz bz-phone">
      <i className="bz-backdrop" aria-hidden />
      <header className="bz-bar">
        {top ? (
          <button type="button" className="bz-icon" aria-label="Back" onClick={back}>
            <LineIcon d={LINE.back} size={26} />
          </button>
        ) : (
          <Hornet size={46} className="bz-bar-mark" />
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
            {top && Page ? (
              <div key={stack.length} className="bz-route" data-dir={depth.dir}>
                <section aria-label={title} className="bz-panel" data-kind={top.kind}>
                  <WindowBoundary>
                    <ViewParamsContext value={patch}>
                      <Page params={top.params} />
                    </ViewParamsContext>
                  </WindowBoundary>
                </section>
                <Related
                  kind={top.kind}
                  onNav={(e, to) => {
                    e.preventDefault();
                    go(to);
                  }}
                />
              </div>
            ) : (
              <div key={0} className="bz-route" data-dir={depth.dir}>
                <WindowBoundary>
                  {HOME_PAGE ? (
                    <HOME_PAGE phone />
                  ) : (
                    <section aria-label="Home" className="bz-panel" data-kind="home">
                      <REGISTRY.home.component params={{}} />
                    </section>
                  )}
                </WindowBoundary>
              </div>
            )}
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
