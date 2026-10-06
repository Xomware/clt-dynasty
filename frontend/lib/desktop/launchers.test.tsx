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
import { REGISTRY, useLaunchers } from "./registry";

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
