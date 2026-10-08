"use client";

import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from "react";

import { ApiError } from "@/lib/api/client";
import { type CltMe, getCltMe } from "@/lib/api/clt";
import { rememberMe } from "@/lib/intro/me";

export type MemberState =
  | { status: "loading" }
  | { status: "member"; me: CltMe }
  // Signed in with Google, but /clt/me answered 403: not on the roster.
  | { status: "not-member" }
  | { status: "error"; message: string };

interface MemberContextValue {
  state: MemberState;
  refresh: () => void;
  // Refetches behind the current state, for a change the member just made
  // (a Sleeper link), so the gate never drops back to its loading screen.
  sync: () => void;
}

// Outside the provider (a component's own test) there is simply no member yet.
const MemberContext = createContext<MemberContextValue>({ state: { status: "loading" }, refresh: () => {}, sync: () => {} });

const settle = (p: Promise<CltMe>): Promise<MemberState> =>
  p.then(
    (me): MemberState => {
      rememberMe(me.linkedSleeperUserId || me.member.sleeperUserId);
      return { status: "member", me };
    },
    (e: Error): MemberState =>
      e instanceof ApiError && e.status === 403 ? { status: "not-member" } : { status: "error", message: e.message },
  );

export function MemberProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<MemberState>({ status: "loading" });

  useEffect(() => {
    let live = true;
    void settle(getCltMe()).then((next) => live && setState(next));
    return () => {
      live = false;
    };
  }, []);

  const refresh = useCallback(() => {
    setState({ status: "loading" });
    void settle(getCltMe()).then(setState);
  }, []);

  const sync = useCallback(() => {
    void settle(getCltMe()).then((next) => next.status === "member" && setState(next));
  }, []);

  return <MemberContext value={{ state, refresh, sync }}>{children}</MemberContext>;
}

export const useMember = () => useContext(MemberContext);
