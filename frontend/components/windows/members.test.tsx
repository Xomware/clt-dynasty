import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("aws-amplify/auth", () => ({
  fetchAuthSession: vi.fn(async () => ({ tokens: { idToken: { toString: () => "id-token" } } })),
}));

import type { Member } from "@/lib/api/members";
import { MemberProvider } from "@/lib/member/use-member";
import { MembersWindow } from "./MembersWindow";

const me = (isAdmin: boolean) => ({
  member: { email: "member@example.com", displayName: "Roster 4", role: "admin", sleeperUserId: "" },
  linkedSleeperUserId: "",
  isAdmin,
});

const member = (n: number, patch: Partial<Member> = {}): Member => ({
  email: `roster${n}@example.com`,
  displayName: `Roster ${n}`,
  role: "member",
  sleeperUserId: `u${n}`,
  active: true,
  boundToAccount: true,
  ...patch,
});

type Reply = [number, unknown];
let routes: Record<string, Reply>;

beforeEach(() => {
  routes = {
    "GET /clt/me": [200, me(true)],
    "GET /clt/members-list": [200, { members: [member(2), member(3, { active: false, boundToAccount: false })] }],
  };
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

const open = () =>
  render(
    <MemberProvider>
      <MembersWindow />
    </MemberProvider>,
  );
const sent = () =>
  vi
    .mocked(fetch)
    .mock.calls.filter(([u]) => String(u).endsWith("/clt/members-update"))
    .map(([, init]) => JSON.parse(String(init?.body)));
const row = (name: string) => screen.getByText(name).closest("li") as HTMLElement;

describe("Admin: Members", () => {
  it("lists the roster with inactive and unbound members marked", async () => {
    open();
    expect(await screen.findByText("Roster 2")).toBeTruthy();
    expect(within(row("Roster 3")).getByText("Inactive")).toBeTruthy();
    expect(within(row("Roster 3")).getByText("Not signed in yet")).toBeTruthy();
    expect(within(row("Roster 2")).queryByText("Inactive")).toBeNull();
  });

  it("sends only what changed", async () => {
    routes["POST /clt/members-update"] = [200, { member: member(2, { email: "new2@example.com", boundToAccount: false }) }];
    open();
    fireEvent.click(await screen.findByRole("button", { name: "Edit Roster 2" }));
    const form = screen.getByRole("form", { name: "Edit Roster 2" });
    const save = within(form).getByRole("button", { name: "Save" });
    expect(save).toHaveProperty("disabled", true);

    fireEvent.change(within(form).getByLabelText("Email"), { target: { value: " new2@example.com " } });
    fireEvent.click(save);
    expect(await screen.findByText("new2@example.com")).toBeTruthy();
    expect(sent()).toEqual([{ email: "roster2@example.com", newEmail: "new2@example.com" }]);
    expect(within(row("Roster 2")).getByText("Not signed in yet")).toBeTruthy();
  });

  it("deactivates and unlinks the Google account", async () => {
    routes["POST /clt/members-update"] = [200, { member: member(2, { active: false, boundToAccount: false }) }];
    open();
    fireEvent.click(await screen.findByRole("button", { name: "Edit Roster 2" }));
    fireEvent.click(screen.getByLabelText(/Active/));
    fireEvent.click(screen.getByLabelText(/Unlink their Google account/));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await within(row("Roster 2")).findByText("Inactive")).toBeTruthy();
    expect(sent()).toEqual([{ email: "roster2@example.com", active: false, clearSub: true }]);
  });

  it("keeps the form open with the API's reason on an email clash", async () => {
    routes["POST /clt/members-update"] = [409, { error: { message: "another member already has that email", status: 409 } }];
    open();
    fireEvent.click(await screen.findByRole("button", { name: "Edit Roster 2" }));
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "roster3@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect((await screen.findByRole("alert")).textContent).toBe("Couldn’t save: another member already has that email");
    expect(screen.getByRole("form", { name: "Edit Roster 2" })).toBeTruthy();
  });

  it("closes the window body to a member who isn't an admin", async () => {
    routes["GET /clt/me"] = [200, me(false)];
    open();
    expect((await screen.findByRole("alert")).textContent).toBe("Only league admins can use this window.");
    expect(vi.mocked(fetch).mock.calls.some(([u]) => String(u).endsWith("/clt/members-list"))).toBe(false);
  });

  it("says so when Xomper's admin gate refuses the list", async () => {
    routes["GET /clt/members-list"] = [403, { error: { message: "not authorized", status: 403 } }];
    open();
    expect((await screen.findByRole("alert")).textContent).toMatch(/doesn’t recognise you as a league admin/);
  });
});
