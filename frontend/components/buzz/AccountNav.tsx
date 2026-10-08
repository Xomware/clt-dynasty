"use client";

import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { TeamAvatar } from "@/components/xp/TeamAvatar";
import { useAuth } from "@/lib/auth/use-auth";
import type { WindowLink } from "@/lib/desktop/deep-link";
import { START_PLACES } from "@/lib/desktop/groups";
import { type Launcher, useLauncherGroups } from "@/lib/desktop/registry";
import { useLeague } from "@/lib/league/use-league";
import { useMember } from "@/lib/member/use-member";
import { LINE, LineIcon } from "./line-icons";

interface AccountNavProps {
  current: WindowLink | undefined;
  onGo: (to: WindowLink) => void;
}

// The phone's account sheet: the member's own pages, Admin for admins, the theme and sign out.
export function AccountNav({ current, onGo }: AccountNavProps) {
  const { state } = useMember();
  const { signOut } = useAuth();
  const { groups, admin } = useLauncherGroups();
  const { teamFor, myRosterId } = useLeague();
  const name = state.status === "member" ? state.me.member.displayName : "";
  const mine = groups.find((g) => g.id === "mine")?.items ?? [];
  const places = START_PLACES.flatMap((k) => mine.filter((l) => l.kind === k));

  const rows = (list: Launcher[]) =>
    list.map((l) => (
      <li key={l.kind}>
        <button
          type="button"
          className="u-sheet-row"
          aria-current={current?.kind === l.kind ? "page" : undefined}
          onClick={() => onGo({ kind: l.kind, params: {} })}
        >
          {l.label}
          <LineIcon d={LINE.chevron} size={18} />
        </button>
      </li>
    ));

  return (
    <>
      <p className="u-sheet-who">
        <TeamAvatar name={name || "Account"} url={myRosterId === null ? null : teamFor(myRosterId).avatarUrl} size={40} className="u-avatar" />
        <span className="min-w-0 truncate">{name ? `Signed in as ${name}` : "Signed in"}</span>
      </p>
      <nav aria-label="Your pages">
        <ul className="u-sheet-group">{rows(places)}</ul>
      </nav>
      {admin.length > 0 && (
        <nav aria-labelledby="account-admin">
          <h3 id="account-admin" className="u-sheet-label">
            Admin
          </h3>
          <ul className="u-sheet-group">{rows(admin)}</ul>
        </nav>
      )}
      <div className="u-sheet-theme">
        <span>Theme</span>
        <ThemeToggle />
      </div>
      <button type="button" className="u-sheet-signout" onClick={() => void signOut()}>
        Sign out
      </button>
    </>
  );
}
