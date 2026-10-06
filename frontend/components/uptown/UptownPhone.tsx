"use client";

import { type MouseEvent, useEffect, useId, useRef, useState } from "react";

import { WindowBoundary } from "@/components/desktop/DesktopWindow";
import { CrownIcon } from "@/components/xp/icons";
import type { WindowLink } from "@/lib/desktop/deep-link";
import { DrillContext, NavigateContext } from "@/lib/desktop/navigation";
import { REGISTRY, useWindowTitle } from "@/lib/desktop/registry";
import { viewKey } from "@/lib/desktop/windows";
import { usePhoneStack } from "@/lib/phone/use-phone-stack";
import { ViewParamsContext } from "@/lib/view-params";
import { Backdrop } from "./Backdrop";
import { OVERRIDES } from "./bodies";
import { DrawerNav } from "./DrawerNav";
import { LINE, LineIcon } from "./icons";
import { MenuDrawer } from "./MenuDrawer";
import { Spotlight } from "./Spotlight";
import { UptownHome } from "./UptownHome";

import "./uptown.css";
import "./uptown-skin.css";
import "./uptown-phone.css";

// The phone in Uptown: Home under a short bar, every other page stacked over
// it, and the groups in a menu drawer. Same stack and history as the XP phone.
export function UptownPhone() {
  const { stack, top, open, back, patch, home } = usePhoneStack();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const windowTitle = useWindowTitle();
  const heading = useRef<HTMLHeadingElement>(null);
  const shown = useRef(stack.length);
  const drawerId = useId();
  const title = top ? windowTitle(top) : "CLT Dynasty";
  const Page = top ? (OVERRIDES[top.kind] ?? REGISTRY[top.kind].component) : null;

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
  const fromMenu = (to: WindowLink) => {
    setMenuOpen(false);
    if (to.kind === "home") home();
    else go(to);
  };
  // Safari never focuses a tapped button, and the drawer and Spotlight hand focus back to it.
  const opener = (show: () => void) => (e: MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.focus();
    show();
  };

  return (
    <div className="uptown u-phone">
      <Backdrop />
      <header className="up-bar">
        {top ? (
          <button type="button" className="up-icon" aria-label="Back" onClick={back}>
            <LineIcon d={LINE.back} size={26} />
          </button>
        ) : (
          <CrownIcon width={30} height={30} className="up-crest" />
        )}
        <h1 ref={heading} tabIndex={-1} className="up-title">
          {title}
        </h1>
        <button type="button" className="up-icon" aria-label="Search" onClick={opener(() => setSearching(true))}>
          <LineIcon d={LINE.search} />
        </button>
        <button
          type="button"
          className="up-icon"
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
        <NavigateContext value={go}>
          <main className="up-screen">
            {top && Page ? (
              <section key={stack.length} aria-label={title} className="up-page">
                <WindowBoundary>
                  <ViewParamsContext value={patch}>
                    <Page params={top.params} />
                  </ViewParamsContext>
                </WindowBoundary>
              </section>
            ) : (
              <WindowBoundary>
                <UptownHome phone />
              </WindowBoundary>
            )}
          </main>
        </NavigateContext>
      </DrillContext>
      {searching && <Spotlight onClose={() => setSearching(false)} onGo={go} />}
      <MenuDrawer id={drawerId} open={menuOpen} onClose={() => setMenuOpen(false)}>
        <DrawerNav current={top} onGo={fromMenu} />
      </MenuDrawer>
    </div>
  );
}
