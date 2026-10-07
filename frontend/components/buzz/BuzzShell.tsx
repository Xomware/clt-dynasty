"use client";

import { type MouseEvent, useEffect, useRef, useState } from "react";

import { WindowBoundary } from "@/components/desktop/DesktopWindow";
import { REVEAL, useReveal } from "@/components/motion/use-reveal";
import { AccountMenu } from "@/components/uptown/AccountMenu";
import { LINE, LineIcon } from "@/components/uptown/icons";
import { groupOf, HOME, urlOf } from "@/components/uptown/pages";
import { Related } from "@/components/uptown/Related";
import { Spotlight } from "@/components/uptown/Spotlight";
import { parseOpen, type WindowLink } from "@/lib/desktop/deep-link";
import { ADMIN, type GroupId } from "@/lib/desktop/groups";
import { DrillContext, NavigateContext } from "@/lib/desktop/navigation";
import { REGISTRY, settledTeam, useLauncherGroups, useWindowTitle } from "@/lib/desktop/registry";
import { patchParams, viewKey, windowId, type WindowParams } from "@/lib/desktop/windows";
import { ViewParamsContext } from "@/lib/view-params";
import { BODIES } from "./bodies";
import { BuzzHome } from "./BuzzHome";
import { BuzzTicker } from "./BuzzTicker";
import { Hornet } from "./Hornet";
import { PageHead } from "./PageHead";

import "./buzz.css";
import "./buzz-skin.css";

// The XP desktop's link names several windows; the last is the one it had in front.
const fromUrl = (): WindowLink => parseOpen(window.location.search).at(-1) ?? HOME;

export type Dir = "next" | "back" | "in";

const isMac = () => /Mac|iPhone|iPad/.test(navigator.platform);

// Buzz City on a desktop: one page at a time on the pinstriped jersey, under
// an arena header that files every window by the XP desktop's groups.
export function BuzzShell() {
  const [{ view, group, dir }, setNav] = useState(() => {
    const view = fromUrl();
    return { view, group: groupOf(view, null), dir: "in" as Dir };
  });
  const [searching, setSearching] = useState(false);
  const { groups, admin } = useLauncherGroups();
  const windowTitle = useWindowTitle();
  const heading = useRef<HTMLHeadingElement>(null);
  const main = useReveal<HTMLElement>(REVEAL);
  const id = windowId(view.kind, view.params);
  const title = windowTitle(view);
  const Page = BODIES[view.kind] ?? REGISTRY[view.kind].component;
  // Admin pages get their group's sub-nav too, though the main nav leaves them out.
  const sections = [...groups, { ...ADMIN, items: admin }];
  const section = sections.find((g) => g.id === group);
  const pages = section?.items ?? [];

  // The clicked link went with the old page, so the new title takes focus. A
  // tab switch stays on the page, so it is keyed without the tab.
  const page = viewKey(view.kind, view.params);
  const shown = useRef(page);
  useEffect(() => {
    if (shown.current === page) return;
    shown.current = page;
    heading.current?.focus({ preventScroll: true });
  }, [page]);

  useEffect(() => {
    const onPop = () =>
      setNav((nav) => {
        const view = fromUrl();
        return { view, group: groupOf(view, nav.group), dir: "back" };
      });
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "k" || !(e.metaKey || e.ctrlKey)) return;
      e.preventDefault();
      setSearching(true);
    };
    window.addEventListener("popstate", onPop);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("popstate", onPop);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  // Pages slide the way the nav reads; a drill to a team or report zooms in.
  const order = ["home", ...sections.flatMap((g) => g.items.map((l) => l.kind))];
  const direction = (from: WindowLink, to: WindowLink): Dir => {
    const a = order.indexOf(from.kind);
    const b = order.indexOf(to.kind);
    if (b === -1) return "in";
    if (a === -1) return "back";
    return b > a ? "next" : "back";
  };
  const go = (to: WindowLink) => {
    if (windowId(to.kind, to.params) === id) return;
    setNav({ view: to, group: groupOf(to, group), dir: direction(view, to) });
    window.history.pushState(null, "", urlOf(to));
    window.scrollTo(0, 0);
  };
  // A tab or filter switch stays on the page, so it replaces the history entry.
  const patch = (params: WindowParams) => {
    const to = { kind: view.kind, params: patchParams(view.params, params) };
    setNav((nav) => ({ ...nav, view: to }));
    window.history.replaceState(null, "", urlOf(to));
  };
  const onNav = (e: MouseEvent, to: WindowLink) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    go(to);
  };
  const first = (g: GroupId): WindowLink => {
    const kind = groups.find((x) => x.id === g)?.items[0]?.kind;
    return kind ? { kind, params: {} } : { kind: "folder", params: { id: g } };
  };
  const crumb = section && group !== null ? { label: section.label, to: first(group) } : null;

  return (
    <div className="buzz">
      <i className="bz-backdrop" aria-hidden />
      <div className="bz-top">
        <header className="bz-header">
          <a href={urlOf(HOME)} className="bz-brand" onClick={(e) => onNav(e, HOME)}>
            <Hornet size={58} />
            <span className="bz-brand-word">
              CLT Dynasty<small>Buzz City</small>
            </span>
          </a>
          <nav aria-label="Main" className="bz-nav">
            <a href={urlOf(HOME)} aria-current={view.kind === "home" ? "page" : undefined} onClick={(e) => onNav(e, HOME)}>
              <LineIcon d={LINE.home} size={16} />
              Home
            </a>
            {groups.map((g) => (
              <a key={g.id} href={urlOf(first(g.id))} aria-current={g.id === group ? "true" : undefined} onClick={(e) => onNav(e, first(g.id))}>
                {g.label}
              </a>
            ))}
          </nav>
          <button
            type="button"
            className="u-pill bz-search"
            aria-keyshortcuts="Meta+K Control+K"
            onClick={(e) => {
              // Safari never focuses a clicked button; Spotlight hands focus back to it.
              e.currentTarget.focus();
              setSearching(true);
            }}
          >
            <LineIcon d={LINE.search} size={18} />
            <span className="bz-search-text">
              Search<span className="bz-search-hint"> pages and teams</span>
            </span>
            <kbd aria-hidden>{isMac() ? "⌘K" : "Ctrl K"}</kbd>
          </button>
          <AccountMenu onNav={onNav} />
        </header>
        <DrillContext value={go}>
          <BuzzTicker />
        </DrillContext>
      </div>
      {pages.length > 0 && (
        <nav aria-label={`${section?.label} pages`} className="bz-subnav">
          {pages.map((p) => {
            const to = { kind: p.kind, params: {} };
            return (
              <a key={p.kind} href={urlOf(to)} aria-current={p.kind === view.kind ? "page" : undefined} onClick={(e) => onNav(e, to)}>
                {p.label}
              </a>
            );
          })}
        </nav>
      )}
      <DrillContext value={go}>
        <NavigateContext value={go}>
          <main ref={main} className="bz-page">
            <div key={page} className="bz-route" data-dir={dir}>
              {view.kind === "home" ? (
                <WindowBoundary key={id}>
                  <BuzzHome ref={heading} />
                </WindowBoundary>
              ) : (
                <>
                  <PageHead
                    title={title}
                    Icon={REGISTRY[view.kind].Icon}
                    team={view.kind === "team" ? settledTeam(view.params) : null}
                    group={crumb}
                    headingRef={heading}
                    onNav={onNav}
                  />
                  <section className="bz-panel" data-kind={view.kind} aria-label={title}>
                    <WindowBoundary key={page}>
                      <ViewParamsContext value={patch}>
                        <Page params={view.params} />
                      </ViewParamsContext>
                    </WindowBoundary>
                  </section>
                  <Related kind={view.kind} onNav={onNav} />
                </>
              )}
            </div>
          </main>
        </NavigateContext>
      </DrillContext>
      {searching && <Spotlight onClose={() => setSearching(false)} onGo={go} />}
    </div>
  );
}
