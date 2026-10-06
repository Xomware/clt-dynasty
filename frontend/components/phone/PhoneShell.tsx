"use client";

import { WindowBoundary } from "@/components/desktop/DesktopWindow";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { BackArrowIcon, CrownIcon, FolderIcon } from "@/components/xp/icons";
import { SpeakerToggle } from "@/components/xp/SpeakerToggle";
import { useAuth } from "@/lib/auth/use-auth";
import type { WindowLink } from "@/lib/desktop/deep-link";
import { DrillContext, NavigateContext } from "@/lib/desktop/navigation";
import { REGISTRY, useLauncherGroups, useWindowTitle } from "@/lib/desktop/registry";
import type { WindowParams } from "@/lib/desktop/windows";
import { useMember } from "@/lib/member/use-member";
import { usePhoneStack } from "@/lib/phone/use-phone-stack";
import { ViewParamsContext } from "@/lib/view-params";

import "./phone.css";

// One column: the program list, and any window opened full-screen over it.
export function PhoneShell() {
  const { state } = useMember();
  const { signOut } = useAuth();
  const { stack, top, open, back, patch, home } = usePhoneStack();
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
          <section className="m-account m-theme" aria-label="Theme">
            <span>Theme</span>
            <ThemeToggle />
          </section>
          <AdminPrograms onOpen={open} />
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
