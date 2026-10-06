"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { WindowBoundary } from "@/components/desktop/DesktopWindow";
import { BackArrowIcon, CrownIcon, FolderIcon } from "@/components/xp/icons";
import { SpeakerToggle } from "@/components/xp/SpeakerToggle";
import { useAuth } from "@/lib/auth/use-auth";
import { parseOpen, type WindowLink } from "@/lib/desktop/deep-link";
import { DrillContext, NavigateContext } from "@/lib/desktop/navigation";
import { REGISTRY, useLauncherGroups, useWindowTitle } from "@/lib/desktop/registry";
import { patchParams, windowId, type WindowParams } from "@/lib/desktop/windows";
import { useMember } from "@/lib/member/use-member";
import { ViewParamsContext } from "@/lib/view-params";

import "./phone.css";

const urlOf = (stack: WindowLink[]) => {
  const top = stack.at(-1);
  return top ? `/?open=${windowId(top.kind, top.params)}` : "/";
};

// One column: the program list, and any window opened full-screen over it.
// Each open is a browser history entry, so the iOS back swipe closes it.
export function PhoneShell() {
  const { state } = useMember();
  const { signOut } = useAuth();
  const [stack, setStack] = useState<WindowLink[]>(() => parseOpen(window.location.search).slice(-1));
  // Screens opened from a deep link have no history entry of ours behind them,
  // so Back pops those itself instead of leaving the site.
  const linked = useRef(stack.length);

  useEffect(() => {
    // Our entries carry their stack depth; anything else is the program list.
    const onPop = (e: PopStateEvent) => {
      const depth = (e.state as { phoneDepth?: number } | null)?.phoneDepth ?? linked.current;
      setStack((s) => s.slice(0, Math.max(depth, 0)));
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // A block body: Chromium's scrollTo returns a promise, and an effect must not return one.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [stack.length]);

  const open = useCallback((link: WindowLink) => {
    setStack((s) => {
      const next = [...s, link];
      window.history.pushState({ phoneDepth: next.length }, "", urlOf(next));
      return next;
    });
  }, []);

  const back = () => {
    if (stack.length > linked.current) return window.history.back();
    linked.current = stack.length - 1;
    const next = stack.slice(0, -1);
    setStack(next);
    window.history.replaceState(null, "", urlOf(next));
  };

  const patch = (params: WindowParams) =>
    setStack((s) => {
      const top = s.at(-1);
      if (!top) return s;
      const next = [...s.slice(0, -1), { ...top, params: patchParams(top.params, params) }];
      window.history.replaceState({ phoneDepth: next.length }, "", urlOf(next));
      return next;
    });

  // Start goes straight back to the list, unwinding our own history entries.
  const home = () => {
    const ours = stack.length - linked.current;
    linked.current = 0;
    if (ours > 0) return window.history.go(-ours);
    setStack([]);
    window.history.replaceState(null, "", "/");
  };

  const top = stack.at(-1);
  const name = state.status === "member" ? state.me.member.displayName : "";

  return (
    <DrillContext value={open}>
      {top ? (
        <PhoneWindow key={stack.length} view={top} onBack={back} onNavigate={open} onPatch={patch} />
      ) : (
        <main className="m-home">
          <header className="m-bar">
            <CrownIcon width={28} height={28} />
            <h1 className="m-bar-title">CLT Dynasty League</h1>
          </header>
          <Programs onOpen={open} />
          <section className="m-account" aria-label="Account">
            <span className="truncate">{name ? `Signed in as ${name}` : "Signed in"}</span>
            <button type="button" className="xp-log-off" onClick={() => void signOut()}>
              Sign out
            </button>
          </section>
        </main>
      )}
      <footer className="m-taskbar">
        <button
          type="button"
          className="xp-start"
          aria-label="Start: all programs"
          onClick={() => (top ? home() : window.scrollTo(0, 0))}
        >
          <CrownIcon width={22} height={22} />
          start
        </button>
        <span className="xp-tray">
          <SpeakerToggle />
        </span>
      </footer>
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

const ChevronGlyph = () => (
  <svg viewBox="0 0 8 12" width={8} height={12} aria-hidden focusable="false" className="ml-auto flex-none">
    <path d="M1.5 1.5 6 6l-4.5 4.5" className="fill-none stroke-current stroke-2" />
  </svg>
);

interface PhoneWindowProps {
  view: WindowLink;
  onBack: () => void;
  onNavigate: (to: WindowLink) => void;
  onPatch: (params: WindowParams) => void;
}

function PhoneWindow({ view, onBack, onNavigate, onPatch }: PhoneWindowProps) {
  const { Icon, component: Body } = REGISTRY[view.kind];
  const title = useWindowTitle()(view);
  return (
    <section className="xp-window m-window" aria-label={title}>
      <header className="xp-titlebar m-window-bar">
        <button type="button" className="m-back" aria-label="Back" onClick={onBack}>
          <BackArrowIcon width={28} height={28} />
        </button>
        <Icon className="flex-none" />
        <h1 className="xp-titlebar-text">{title}</h1>
      </header>
      <div className="xp-window-body m-window-body">
        <WindowBoundary>
          <NavigateContext value={onNavigate}>
            <ViewParamsContext value={onPatch}>
              <Body params={view.params} />
            </ViewParamsContext>
          </NavigateContext>
        </WindowBoundary>
      </div>
    </section>
  );
}
