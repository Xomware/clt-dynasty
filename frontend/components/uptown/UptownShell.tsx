"use client";

import { type ComponentType, type MouseEvent, useEffect, useRef, useState } from "react";

import { WindowBoundary } from "@/components/desktop/DesktopWindow";
import { CrownIcon } from "@/components/xp/icons";
import { parseOpen, type WindowLink } from "@/lib/desktop/deep-link";
import type { GroupId } from "@/lib/desktop/groups";
import { DrillContext, NavigateContext } from "@/lib/desktop/navigation";
import { REGISTRY, useLauncherGroups, useWindowTitle } from "@/lib/desktop/registry";
import { patchParams, viewKey, windowId, type WindowParams } from "@/lib/desktop/windows";
import { ViewParamsContext } from "@/lib/view-params";
import { AccountMenu } from "./AccountMenu";
import { Backdrop } from "./Backdrop";
import { GroupPage } from "./GroupPage";
import { LINE, LineIcon } from "./icons";
import { groupOf, HOME, urlOf } from "./pages";
import { Spotlight } from "./Spotlight";

import "./uptown.css";
import "./uptown-skin.css";

type Body = ComponentType<{ params: WindowParams }>;

// Kinds whose XP body is shell chrome rather than content.
export const OVERRIDES: Partial<Record<string, Body>> = { folder: GroupPage };

// The XP desktop's link names several windows; the last is the one it had in front.
const fromUrl = (): WindowLink => parseOpen(window.location.search).at(-1) ?? HOME;

const isMac = () => /Mac|iPhone|iPad/.test(navigator.platform);

// One page at a time under a header that files every window by its group,
// the same groups as the XP desktop's folders.
export function UptownShell() {
  const [{ view, group }, setNav] = useState(() => {
    const view = fromUrl();
    return { view, group: groupOf(view, null) };
  });
  const [searching, setSearching] = useState(false);
  const { groups } = useLauncherGroups();
  const windowTitle = useWindowTitle();
  const heading = useRef<HTMLHeadingElement>(null);
  const id = windowId(view.kind, view.params);
  const title = view.kind === "home" ? "CLT Dynasty League" : windowTitle(view);
  const Page = OVERRIDES[view.kind] ?? REGISTRY[view.kind].component;
  const pages = groups.find((g) => g.id === group)?.items ?? [];

  useEffect(() => {
    const onPop = () =>
      setNav((nav) => {
        const view = fromUrl();
        return { view, group: groupOf(view, nav.group) };
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

  const go = (to: WindowLink) => {
    if (windowId(to.kind, to.params) === id) return;
    setNav({ view: to, group: groupOf(to, group) });
    window.history.pushState(null, "", urlOf(to));
    window.scrollTo(0, 0);
    // The clicked link may unmount with the old page, so focus lands on the new title.
    heading.current?.focus({ preventScroll: true });
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

  return (
    <div className="uptown">
      <Backdrop />
      <header className="u-header">
        <a href={urlOf(HOME)} className="u-brand" aria-current={view.kind === "home" ? "page" : undefined} onClick={(e) => onNav(e, HOME)}>
          <CrownIcon width={34} height={34} />
          <span>CLT Dynasty</span>
        </a>
        <nav aria-label="Main" className="u-nav">
          {groups.map((g) => (
            <a key={g.id} href={urlOf(first(g.id))} aria-current={g.id === group ? "true" : undefined} onClick={(e) => onNav(e, first(g.id))}>
              {g.label}
            </a>
          ))}
        </nav>
        <button
          type="button"
          className="u-pill u-search"
          aria-keyshortcuts="Meta+K Control+K"
          onClick={(e) => {
            // Safari never focuses a clicked button; Spotlight hands focus back to it.
            e.currentTarget.focus();
            setSearching(true);
          }}
        >
          <LineIcon d={LINE.search} size={18} />
          Search
          <kbd aria-hidden>{isMac() ? "⌘K" : "Ctrl K"}</kbd>
        </button>
        <AccountMenu onNav={onNav} />
      </header>
      {pages.length > 0 && (
        <nav aria-label={`${groups.find((g) => g.id === group)?.label} pages`} className="u-subnav">
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
          <main className="u-page">
            <h1 ref={heading} tabIndex={-1} className="u-title">
              {title}
            </h1>
            <section className="u-panel" aria-label={title}>
              <WindowBoundary key={viewKey(view.kind, view.params)}>
                <ViewParamsContext value={patch}>
                  <Page params={view.params} />
                </ViewParamsContext>
              </WindowBoundary>
            </section>
          </main>
        </NavigateContext>
      </DrillContext>
      {searching && <Spotlight onClose={() => setSearching(false)} onGo={go} />}
    </div>
  );
}
