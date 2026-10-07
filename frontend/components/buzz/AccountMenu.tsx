"use client";

import { type MouseEvent, useEffect, useId, useRef, useState } from "react";

import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { TeamAvatar } from "@/components/xp/TeamAvatar";
import { useAuth } from "@/lib/auth/use-auth";
import type { WindowLink } from "@/lib/desktop/deep-link";
import { START_PLACES } from "@/lib/desktop/groups";
import { type Launcher, useLauncherGroups } from "@/lib/desktop/registry";
import { useLeague } from "@/lib/league/use-league";
import { useMember } from "@/lib/member/use-member";
import { LINE, LineIcon } from "./line-icons";
import { urlOf } from "./pages";

interface AccountMenuProps {
  onNav: (e: MouseEvent, to: WindowLink) => void;
}

// The header's account button: the member's own pages, the theme and sign out.
export function AccountMenu({ onNav }: AccountMenuProps) {
  const { state } = useMember();
  const { signOut } = useAuth();
  const { groups, admin } = useLauncherGroups();
  const { teamFor, myRosterId } = useLeague();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const id = useId();
  const name = (state.status === "member" && state.me.member.displayName) || "Account";
  const mine = groups.find((g) => g.id === "mine")?.items ?? [];
  const places = START_PLACES.flatMap((k) => mine.filter((l) => l.kind === k));

  const links = (list: Launcher[]) =>
    list.map((l) => {
      const to = { kind: l.kind, params: {} };
      return (
        <li key={l.kind}>
          <a
            href={urlOf(to)}
            onClick={(e) => {
              setOpen(false);
              onNav(e, to);
            }}
          >
            {l.label}
          </a>
        </li>
      );
    });

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      button.current?.focus();
    };
    const onPointer = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  return (
    <div ref={root} className="u-account">
      <button
        ref={button}
        type="button"
        className="u-pill u-account-button"
        aria-label={`${name}, account menu`}
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => setOpen((o) => !o)}
      >
        <TeamAvatar name={name} url={myRosterId === null ? null : teamFor(myRosterId).avatarUrl} size={32} className="u-avatar" />
        <span className="u-account-name">{name}</span>
        <LineIcon d={LINE.down} size={14} />
      </button>
      {open && (
        <nav id={id} aria-label="Account" className="u-account-menu">
          <p className="u-account-head">{name}</p>
          <ul>{links(places)}</ul>
          {admin.length > 0 && (
            <>
              <p id={`${id}-admin`} className="u-account-label">
                Admin
              </p>
              <ul aria-labelledby={`${id}-admin`}>{links(admin)}</ul>
            </>
          )}
          <ul className="u-account-foot">
            <li className="u-account-theme">
              <span>Theme</span>
              <ThemeToggle />
            </li>
            <li>
              <button type="button" onClick={() => void signOut()}>
                Sign out
              </button>
            </li>
          </ul>
        </nav>
      )}
    </div>
  );
}
