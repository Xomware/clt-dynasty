"use client";

import { type MouseEvent, useEffect, useId, useRef, useState } from "react";

import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useAuth } from "@/lib/auth/use-auth";
import type { WindowLink } from "@/lib/desktop/deep-link";
import { START_PLACES } from "@/lib/desktop/groups";
import { useLaunchers } from "@/lib/desktop/registry";
import { useMember } from "@/lib/member/use-member";
import { LINE, LineIcon } from "./icons";
import { urlOf } from "./pages";

interface AccountMenuProps {
  onNav: (e: MouseEvent, to: WindowLink) => void;
}

// The header's account button: the member's own pages, the theme and sign out.
export function AccountMenu({ onNav }: AccountMenuProps) {
  const { state } = useMember();
  const { signOut } = useAuth();
  const launchers = useLaunchers();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const id = useId();
  const name = (state.status === "member" && state.me.member.displayName) || "Account";
  const places = START_PLACES.flatMap((k) => launchers.filter((l) => l.kind === k && l.group === "mine"));

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
        <span className="u-avatar" aria-hidden>
          {name.charAt(0).toUpperCase()}
        </span>
        <span className="u-account-name">{name}</span>
        <LineIcon d={LINE.down} size={14} />
      </button>
      {open && (
        <nav id={id} aria-label="Account" className="u-account-menu">
          <p className="u-account-head">{name}</p>
          <ul>
            {places.map((l) => {
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
            })}
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
