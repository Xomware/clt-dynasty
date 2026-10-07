"use client";

import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useAuth } from "@/lib/auth/use-auth";
import type { WindowLink } from "@/lib/desktop/deep-link";
import { useLauncherGroups } from "@/lib/desktop/registry";
import { useMember } from "@/lib/member/use-member";
import { LINE, LineIcon } from "./line-icons";

interface DrawerNavProps {
  current: WindowLink | undefined;
  onGo: (to: WindowLink) => void;
}

// The phone's menu: Home, then a section per group with its pages, then the account.
export function DrawerNav({ current, onGo }: DrawerNavProps) {
  const { pinned, groups, admin } = useLauncherGroups();
  const { state } = useMember();
  const { signOut } = useAuth();
  const name = state.status === "member" ? state.me.member.displayName : "";
  const here = (kind: string) => (current?.kind ?? "home") === kind || undefined;

  const row = (kind: WindowLink["kind"], label: string) => (
    <li key={kind}>
      <button type="button" className="u-drawer-row" aria-current={here(kind) && "page"} onClick={() => onGo({ kind, params: {} })}>
        {label}
        <LineIcon d={LINE.chevron} size={18} />
      </button>
    </li>
  );

  return (
    <>
      <nav aria-label="Pages" className="u-drawer-nav">
        <ul className="u-drawer-group">{pinned.map((l) => row(l.kind, l.label))}</ul>
        {groups.map((g) => (
          <section key={g.id} aria-labelledby={`drawer-${g.id}`}>
            <h3 id={`drawer-${g.id}`} className="u-drawer-label">
              {g.label}
            </h3>
            <ul className="u-drawer-group">{g.items.map((l) => row(l.kind, l.label))}</ul>
          </section>
        ))}
      </nav>
      <section aria-label="Account" className="u-drawer-account">
        <p className="u-drawer-label">{name ? `Signed in as ${name}` : "Signed in"}</p>
        {admin.length > 0 && (
          <nav aria-labelledby="drawer-admin">
            <h3 id="drawer-admin" className="u-drawer-label">
              Admin
            </h3>
            <ul className="u-drawer-group">{admin.map((l) => row(l.kind, l.label))}</ul>
          </nav>
        )}
        <div className="u-drawer-theme">
          <span>Theme</span>
          <ThemeToggle />
        </div>
        <button type="button" className="u-drawer-signout" onClick={() => void signOut()}>
          Sign out
        </button>
      </section>
    </>
  );
}
