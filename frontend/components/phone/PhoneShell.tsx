"use client";

import { useCallback, useLayoutEffect, useRef } from "react";

import { WindowBoundary } from "@/components/desktop/DesktopWindow";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { BrandMark } from "@/components/buzz/BrandMark";
import { BackArrowIcon, FolderIcon, HomeIcon, PlayersIcon, ScoresIcon, SearchIcon, StandingsIcon } from "@/components/xp/icons";
import { SpeakerToggle } from "@/components/xp/SpeakerToggle";
import { useAuth } from "@/lib/auth/use-auth";
import type { WindowLink } from "@/lib/desktop/deep-link";
import { DrillContext, NavigateContext } from "@/lib/desktop/navigation";
import { REGISTRY, useLauncherGroups, useLaunchers, useWindowTitle } from "@/lib/desktop/registry";
import { viewKey, type WindowParams } from "@/lib/desktop/windows";
import { useMember } from "@/lib/member/use-member";
import { ViewLabelContext } from "@/lib/nav/label";
import { useOpeners } from "@/lib/nav/openers";
import { useEdgeSwipe } from "@/lib/phone/use-edge-swipe";
import { PHONE_KEEP, usePhoneStack } from "@/lib/phone/use-phone-stack";
import { ViewParamsContext } from "@/lib/view-params";

import "./phone.css";

// The taskbar's quick launch beside Start.
const TABS: { link: WindowLink; label: string; Icon: typeof HomeIcon }[] = [
  { link: { kind: "home", params: {} }, label: "Home", Icon: HomeIcon },
  { link: { kind: "scores", params: {} }, label: "Scores", Icon: ScoresIcon },
  { link: { kind: "standings", params: {} }, label: "Standings", Icon: StandingsIcon },
  { link: { kind: "players", params: {} }, label: "Players", Icon: PlayersIcon },
];

const SEARCH: WindowLink = { kind: "search", params: {} };

// One column: the program list, and any window opened full-screen over it,
// with Start and four destinations on the taskbar.
export function PhoneShell() {
  const { state } = useMember();
  const { signOut } = useAuth();
  const { stack, top, open, back, patch, home, setLabel, labelAt } = usePhoneStack();
  const name = state.status === "member" ? state.me.member.displayName : "";
  const screens = useRef<HTMLDivElement>(null);
  const openers = useOpeners(screens);
  const shown = useRef(stack.length);
  const launchers = useLaunchers();
  const tabs = TABS.filter((t) => launchers.some((l) => l.kind === t.link.kind));
  useEdgeSwipe(screens, stack.length, back);

  // A new screen's title takes focus; Back hands it to the row or link that
  // opened the screen it left.
  useLayoutEffect(() => {
    if (shown.current === stack.length) return;
    const back = stack.length < shown.current;
    shown.current = stack.length;
    const heading = screens.current?.querySelector<HTMLElement>(":scope > :not([hidden]) h1");
    if (back) openers.focus(stack.length, heading);
    else heading?.focus({ preventScroll: true });
  }, [stack.length, openers]);

  const go = (to: WindowLink) => {
    if (top && viewKey(to.kind, to.params) === viewKey(top.kind, top.params)) return;
    openers.leave(stack.length);
    open(to);
  };
  // The screens under the top one stay mounted but hidden, so Back finds each as it was left.
  const kept = stack.map((view, i) => ({ view, at: i + 1 })).slice(-PHONE_KEEP);

  return (
    <DrillContext value={go}>
      <div ref={screens}>
        <main className="m-home" hidden={top !== undefined}>
          <header className="m-bar">
            <BrandMark mark="monogram" alt="" height={36} className="flex-none" priority />
            <h1 tabIndex={-1} className="m-bar-title">
              CLT Dynasty League
            </h1>
            <SearchButton onSearch={() => go(SEARCH)} />
          </header>
          <Programs onOpen={go} />
          <section className="m-account m-theme" aria-label="Theme">
            <span>Theme</span>
            <ThemeToggle />
          </section>
          <section className="m-account m-theme" aria-label="Sound">
            <span>Sound</span>
            <span className="xp-tray">
              <SpeakerToggle />
            </span>
          </section>
          <AdminPrograms onOpen={go} />
          <section className="m-account" aria-label="Account">
            <span className="truncate">{name ? `Signed in as ${name}` : "Signed in"}</span>
            <button type="button" className="xp-log-off" onClick={() => void signOut()}>
              Sign out
            </button>
          </section>
        </main>
        {kept.map(({ view, at }) => (
          <PhoneWindow
            key={`${at}:${viewKey(view.kind, view.params)}`}
            view={view}
            at={at}
            current={at === stack.length}
            backTo={labelAt(at - 1)}
            onBack={back}
            onNavigate={go}
            onSearch={() => go(SEARCH)}
            onPatch={patch}
            setLabel={setLabel}
          />
        ))}
      </div>
      <nav className="m-taskbar" aria-label="Taskbar">
        <button type="button" className="xp-start" aria-label="Start: all programs" aria-current={top ? undefined : "page"} onClick={() => (top ? home() : window.scrollTo(0, 0))}>
          <BrandMark mark="crown" alt="" height={18} className="flex-none" />
          start
        </button>
        {tabs.map(({ link, label, Icon }) => (
          <button
            key={label}
            type="button"
            className="m-task"
            aria-current={top?.kind === link.kind ? "page" : undefined}
            onClick={() => go(link)}
          >
            <Icon width={22} height={22} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </DrillContext>
  );
}

// Two levels: Home and a row per group; a group opens as a folder screen.
function Programs({ onOpen }: { onOpen: (link: WindowLink) => void }) {
  const { pinned, groups } = useLauncherGroups();
  return (
    <nav className="m-programs" aria-label="Programs">
      <h2 className="m-programs-title">Programs</h2>
      <ul>
        {pinned.map(({ kind, label, Icon }) => (
          <li key={kind}>
            <button type="button" className="m-program" onClick={() => onOpen({ kind, params: {} })}>
              <Icon width={32} height={32} />
              {label}
            </button>
          </li>
        ))}
        {groups.map((g) => (
          <li key={g.id}>
            <button type="button" className="m-program" onClick={() => onOpen({ kind: "folder", params: { id: g.id } })}>
              <FolderIcon width={32} height={32} />
              <span className="m-program-label">
                {g.label}
                <span className="m-program-detail">{g.items.map((l) => l.label).join(", ")}</span>
              </span>
              <ChevronGlyph />
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}

// Only admins get this list, under their own account rather than in Programs.
function AdminPrograms({ onOpen }: { onOpen: (link: WindowLink) => void }) {
  const { admin } = useLauncherGroups();
  if (admin.length === 0) return null;
  return (
    <nav className="m-programs" aria-labelledby="m-admin">
      <h2 id="m-admin" className="m-programs-title">
        Admin
      </h2>
      <ul>
        {admin.map(({ kind, label, Icon }) => (
          <li key={kind}>
            <button type="button" className="m-program" onClick={() => onOpen({ kind, params: {} })}>
              <Icon width={32} height={32} />
              {label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}

const ChevronGlyph = () => (
  <svg viewBox="0 0 8 12" width={8} height={12} aria-hidden focusable="false" className="ml-auto flex-none">
    <path d="M1.5 1.5 6 6l-4.5 4.5" className="fill-none stroke-current stroke-2" />
  </svg>
);

function SearchButton({ onSearch }: { onSearch: () => void }) {
  return (
    <button type="button" className="m-search" aria-label="Search" onClick={onSearch}>
      <SearchIcon width={26} height={26} />
    </button>
  );
}

interface PhoneWindowProps {
  view: WindowLink;
  at: number;
  current: boolean;
  backTo: string;
  onBack: () => void;
  onNavigate: (to: WindowLink) => void;
  onSearch: () => void;
  onPatch: (params: WindowParams) => void;
  setLabel: (depth: number, label: string | null) => void;
}

// A screen under the top one never changes its own link.
const ignore = () => {};

function PhoneWindow({ view, at, current, backTo, onBack, onNavigate, onSearch, onPatch, setLabel }: PhoneWindowProps) {
  const { Icon, component: Body } = REGISTRY[view.kind];
  const title = useWindowTitle()(view);
  const label = useCallback((l: string | null) => setLabel(at, l), [at, setLabel]);
  return (
    <section className="xp-window m-window" aria-label={title} hidden={!current}>
      <header className="xp-titlebar m-window-bar">
        <button type="button" className="m-back" aria-label={`Back to ${backTo}`} onClick={onBack}>
          <BackArrowIcon width={28} height={28} />
          <span aria-hidden className="m-back-label">
            {backTo}
          </span>
        </button>
        <Icon className="flex-none" />
        <h1 tabIndex={-1} className="xp-titlebar-text">
          {title}
        </h1>
        {view.kind !== "search" && <SearchButton onSearch={onSearch} />}
      </header>
      <div className="xp-window-body m-window-body">
        <WindowBoundary>
          <NavigateContext value={onNavigate}>
            <ViewParamsContext value={current ? onPatch : ignore}>
              <ViewLabelContext value={label}>
                <Body params={view.params} />
              </ViewLabelContext>
            </ViewParamsContext>
          </NavigateContext>
        </WindowBoundary>
      </div>
    </section>
  );
}
