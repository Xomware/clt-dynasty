import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("aws-amplify/auth", () => ({
  fetchAuthSession: vi.fn(async () => ({ tokens: { idToken: { toString: () => "id-token" } } })),
}));

import { MemberProvider } from "@/lib/member/use-member";
import { SettingsWindow } from "./SettingsWindow";

const me = (isAdmin: boolean) => ({
  member: { email: "member@example.com", displayName: "Roster 4", role: "member", sleeperUserId: "" },
  linkedSleeperUserId: "",
  isAdmin,
});
const PROFILE = {
  user: { userId: "s", email: "", sleeperUserId: "", sleeperUsername: "", sleeperAvatar: "", displayName: "", hasLinkedSleeper: false, createdAt: "", updatedAt: "" },
};

type Reply = [number, unknown];
let routes: Record<string, Reply>;

beforeEach(() => {
  routes = { "GET /clt/me": [200, me(true)], "GET /me/profile": [200, PROFILE], "GET /clt/settings": [200, { emailNotifications: false }] };
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const key = `${init?.method ?? "GET"} ${new URL(String(input)).pathname}`;
    const hit = routes[key];
    if (!hit) throw new Error(`unmocked ${key}`);
    return new Response(JSON.stringify(hit[1]), { status: hit[0] });
  });
});
afterEach(() => {
  vi.restoreAllMocks();
});

const open = (tab?: string) =>
  render(
    <MemberProvider>
      <SettingsWindow params={tab ? { tab } : {}} />
    </MemberProvider>,
  );

describe("Settings: League tab", () => {
  it("is not there for a member who isn't an admin", async () => {
    routes["GET /clt/me"] = [200, me(false)];
    open();
    expect(await screen.findByText("League member")).toBeTruthy();
    expect(screen.queryByRole("tab")).toBeNull();
  });

  it("turns the league's emails on", async () => {
    routes["POST /clt/settings-update"] = [200, { emailNotifications: true }];
    open();
    fireEvent.click(await screen.findByRole("tab", { name: "League" }));
    const box = await screen.findByRole("checkbox", { name: /Email active members/ });
    expect(box).toHaveProperty("checked", false);
    fireEvent.click(box);
    expect(await screen.findByText("Emails are on for the whole league.")).toBeTruthy();
    const call = vi.mocked(fetch).mock.calls.find(([u]) => String(u).endsWith("/clt/settings-update"));
    expect(JSON.parse(String(call?.[1]?.body))).toEqual({ emailNotifications: true });
  });

  it("keeps the old value and says why when the admin gate refuses", async () => {
    routes["POST /clt/settings-update"] = [403, { error: { message: "not authorized", status: 403 } }];
    open("league");
    fireEvent.click(await screen.findByRole("checkbox", { name: /Email active members/ }));
    expect((await screen.findByRole("alert")).textContent).toBe("Couldn’t save: not authorized");
    await waitFor(() => expect(screen.getByRole("checkbox")).toHaveProperty("checked", false));
  });

  it("shows a failed load", async () => {
    routes["GET /clt/settings"] = [500, { error: { message: "Internal server error" } }];
    open("league");
    expect((await screen.findByRole("alert")).textContent).toBe("Couldn’t load league settings: Internal server error");
  });
});
