"use client";

import { type MouseEvent, useCallback, useEffect, useState } from "react";

import { WindowBoundary } from "@/components/desktop/DesktopWindow";
import { REVEAL, useReveal } from "@/components/motion/use-reveal";
import { AccountMenu } from "./AccountMenu";
import { BrandMark } from "./BrandMark";
import { LINE, LineIcon } from "./line-icons";
import { type Crumb, Crumbs } from "./Crumbs";
import { HOME, urlOf } from "./pages";
import { Related } from "./Related";
import { Spotlight } from "./Spotlight";
import type { WindowLink } from "@/lib/desktop/deep-link";
import { ADMIN, type GroupId } from "@/lib/desktop/groups";
import { DrillContext, NavigateContext } from "@/lib/desktop/navigation";
import { REGISTRY, settledTeam, useLauncherGroups, useWindowTitle } from "@/lib/desktop/registry";
import type { WindowParams } from "@/lib/desktop/windows";
import { ViewLabelContext } from "@/lib/nav/label";
import { ViewParamsContext } from "@/lib/view-params";
import { BODIES } from "./bodies";
import { BuzzHome } from "./BuzzHome";
import { BuzzTicker } from "./BuzzTicker";
import { PageHead } from "./PageHead";
import { type Dir, type Route, useTrail } from "./use-trail";

import "./buzz.css";
import "./buzz-skin.css";

// A page behind the current one never changes its own link.
const ignore = () => {};

const isMac = () => /Mac|iPhone|iPad/.test(navigator.platform);

// Buzz City on a desktop: one page at a time on the pinstriped jersey, under
// an arena header that files every window by the XP desktop's groups.
export function BuzzShell() {
  const main = useReveal<HTMLElement>(REVEAL);
  const trail = useTrail(main);
  const { entry, routes, current, labelOf } = trail;
  const view = current.view;
  const group = current.group;
  const [searching, setSearching] = useState(false);
  const { groups, admin } = useLauncherGroups();
  const windowTitle = useWindowTitle();
  // Admin pages get their group's sub-nav too, though the main nav leaves them out.
  const sections = [...groups, { ...ADMIN, items: admin }];
  const section = sections.find((g) => g.id === group);
  const pages = section?.items ?? [];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "k" || !(e.metaKey || e.ctrlKey)) return;
      e.preventDefault();
      setSearching(true);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
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
  // Links inside a page drill, adding to the path; the header, the sub-nav,
  // Spotlight and Keep going jump, starting a new one.
  const drill = (to: WindowLink) => trail.go(to, { drill: true, dir: "in" });
  const go = (to: WindowLink) => trail.go(to, { drill: false, dir: direction(view, to) });
  const onNav = (e: MouseEvent, to: WindowLink) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    go(to);
  };
  const first = (g: GroupId): WindowLink => {
    const kind = groups.find((x) => x.id === g)?.items[0]?.kind;
    return kind ? { kind, params: {} } : { kind: "folder", params: { id: g } };
  };
  const link = (label: string, to: WindowLink): Crumb => ({ label, href: urlOf(to), onSelect: () => go(to) });
  const parent = section && group !== null ? link(section.label, first(group)) : link("Home", HOME);
  // The path taken, Home first. A path that set out from Home walks back to
  // it like any other stop, rather than listing it twice.
  const stops = entry.trail.map((s): Crumb => ({ label: s.label, href: urlOf(s.view), onSelect: () => trail.jump(s) }));
  const fromHome = entry.trail[0]?.view.kind === "home";
  const crumbs = entry.trail.length ? [...(fromHome ? [] : [link("Home", HOME)]), ...stops] : [link("Home", HOME), ...(parent.label === "Home" ? [] : [parent])];
  // Back is the browser's Back when there is a page behind this one; a page
  // opened from a link goes up to its group instead.
  const back = entry.prev ? { label: entry.prev.label, run: () => window.history.back() } : { label: parent.label, run: parent.onSelect };

  return (
    <div className="buzz">
      <i className="bz-backdrop" aria-hidden />
      <div className="bz-top">
        <header className="bz-header">
          <a href={urlOf(HOME)} className="bz-brand" onClick={(e) => onNav(e, HOME)}>
            <BrandMark mark="seal" alt="CLT Dynasty Fantasy Football, home" className="bz-brand-seal" priority />
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
        {view.kind !== "home" && (
          <div className="bz-trail">
            <button type="button" className="bz-back" onClick={back.run}>
              <LineIcon d={LINE.back} size={18} />
              <span className="truncate">Back to {back.label}</span>
            </button>
            <Crumbs items={crumbs} here={labelOf(current)} />
          </div>
        )}
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
      <DrillContext value={drill}>
        <NavigateContext value={drill}>
          <main ref={main} className="bz-page">
            {routes.map((r) => (
              <BuzzRoute
                key={trail.keyOf(r)}
                route={r}
                hidden={r !== current}
                title={windowTitle(r.view)}
                onNav={onNav}
                onPatch={r === current ? trail.patch : ignore}
                setLabel={trail.setLabel}
              />
            ))}
          </main>
        </NavigateContext>
      </DrillContext>
      {searching && <Spotlight onClose={() => setSearching(false)} onGo={go} />}
    </div>
  );
}

interface BuzzRouteProps {
  route: Route;
  hidden: boolean;
  title: string;
  onNav: (e: MouseEvent, to: WindowLink) => void;
  onPatch: (params: WindowParams) => void;
  setLabel: (depth: number, label: string | null) => void;
}

// One page of the stack. The ones behind the current page stay mounted but
// hidden, so Back shows them exactly as they were left.
function BuzzRoute({ route, hidden, title, onNav, onPatch, setLabel }: BuzzRouteProps) {
  const { view, depth } = route;
  const Page = BODIES[view.kind] ?? REGISTRY[view.kind].component;
  const label = useCallback((l: string | null) => setLabel(depth, l), [depth, setLabel]);
  return (
    <div className="bz-route" data-dir={route.dir} data-restored={route.restored || undefined} hidden={hidden}>
      <ViewLabelContext value={label}>
        {view.kind === "home" ? (
          <WindowBoundary>
            <BuzzHome />
          </WindowBoundary>
        ) : (
          <>
            <PageHead title={title} Icon={REGISTRY[view.kind].Icon} team={view.kind === "team" ? settledTeam(view.params) : null} />
            <section className="bz-panel" data-kind={view.kind} aria-label={title}>
              <WindowBoundary>
                <ViewParamsContext value={onPatch}>
                  <Page params={view.params} />
                </ViewParamsContext>
              </WindowBoundary>
            </section>
            <Related kind={view.kind} onNav={onNav} />
          </>
        )}
      </ViewLabelContext>
    </div>
  );
}
