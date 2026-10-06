import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

const me = vi.hoisted(() => ({ isAdmin: false }));
vi.mock("@/lib/api/clt", () => ({
  getCltMe: vi.fn(async () => ({
    member: { email: "member@example.com", displayName: "Roster 4", role: "member", sleeperUserId: "" },
    linkedSleeperUserId: "",
    isAdmin: me.isAdmin,
  })),
}));

import { MemberProvider } from "@/lib/member/use-member";
import { parseOpen } from "./deep-link";
import { GROUPS, START_PINNED, START_PLACES } from "./groups";
import { REGISTRY, useLauncherGroups, useLaunchers } from "./registry";

const wrapper = ({ children }: { children: ReactNode }) => <MemberProvider>{children}</MemberProvider>;
const admin = Object.keys(REGISTRY).filter((k) => REGISTRY[k].adminOnly);

describe("launchers", () => {
  it("leaves the admin windows off for a member", async () => {
    me.isAdmin = false;
    const { result } = renderHook(() => useLaunchers(), { wrapper });
    await waitFor(() => expect(result.current.some((l) => l.kind === "standings")).toBe(true));
    expect(admin.length).toBeGreaterThan(0);
    expect(result.current.filter((l) => admin.includes(l.kind))).toEqual([]);
  });

  it("adds them once /clt/me says admin", async () => {
    me.isAdmin = true;
    const { result } = renderHook(() => useLaunchers(), { wrapper });
    await waitFor(() => expect(result.current.map((l) => l.kind)).toEqual(expect.arrayContaining(admin)));
  });
});

describe("launcher groups", () => {
  const launchable = Object.keys(REGISTRY).filter((k) => !REGISTRY[k].drillOnly);

  it("files every launchable window but Home in a known group", () => {
    const ids: string[] = GROUPS.map((g) => g.id);
    expect(launchable.filter((k) => !REGISTRY[k].group)).toEqual(["home"]);
    expect(launchable.filter((k) => REGISTRY[k].group && !ids.includes(REGISTRY[k].group))).toEqual([]);
    expect(Object.keys(REGISTRY).filter((k) => REGISTRY[k].adminOnly && REGISTRY[k].group !== "admin")).toEqual([]);
    expect([...START_PINNED, ...START_PLACES].filter((k) => !launchable.includes(k))).toEqual([]);
  });

  it("files the programs in group order and hides Admin from a member", async () => {
    me.isAdmin = false;
    const { result } = renderHook(() => useLauncherGroups(), { wrapper });
    await waitFor(() => expect(result.current.groups.length).toBeGreaterThan(0));
    expect(result.current.pinned.map((l) => l.kind)).toEqual(["home"]);
    expect(Object.fromEntries(result.current.groups.map((g) => [g.label, g.items.map((l) => l.label)]))).toEqual({
      League: ["Standings", "Scores", "Playoffs", "World Cup", "NFL Teams", "Rules"],
      History: ["History", "Matchup History"],
      Draft: ["Draft History", "Draft Order", "Taxi Squads"],
      "My Stuff": ["My Team", "Profile", "Team Analyzer", "Settings"],
      Community: ["Proposals", "AI Review", "Search"],
    });
  });

  it("shows Admin once /clt/me says admin", async () => {
    me.isAdmin = true;
    const { result } = renderHook(() => useLauncherGroups(), { wrapper });
    await waitFor(() => expect(result.current.groups.at(-1)?.items.map((l) => l.kind)).toEqual(admin));
  });

  it("deep-links every launchable window and every folder", () => {
    for (const kind of launchable) expect(parseOpen(`?open=${kind}`)).toEqual([{ kind, params: {} }]);
    for (const { id } of GROUPS) expect(parseOpen(`?open=folder:${id}`)).toEqual([{ kind: "folder", params: { id } }]);
    expect(parseOpen("?open=folder:attic")).toEqual([]);
  });
});
