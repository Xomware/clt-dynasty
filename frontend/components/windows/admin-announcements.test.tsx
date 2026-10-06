import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("aws-amplify/auth", () => ({
  fetchAuthSession: vi.fn(async () => ({ tokens: { idToken: { toString: () => "id-token" } } })),
}));

import { AlertsProvider } from "@/lib/alerts/alerts";
import type { Announcement } from "@/lib/announcements";
import { MemberProvider } from "@/lib/member/use-member";
import { AdminAnnouncementsWindow } from "./AdminAnnouncementsWindow";

const ME = {
  member: { email: "member@example.com", displayName: "Roster 4", role: "admin", sleeperUserId: "" },
  linkedSleeperUserId: "",
  isAdmin: true,
};

const row = (id: string, patch: Partial<Announcement> = {}): Announcement => ({
  id,
  title: `Notice ${id}`,
  body: `Body ${id}`,
  priority: "info",
  expires_at: null,
  is_active: true,
  display_order: 1,
  created_at: "2026-09-01T12:00:00+00:00",
  updated_at: "2026-09-01T12:00:00+00:00",
  ...patch,
});

type Reply = [number, unknown];
let routes: Record<string, Reply>;

beforeEach(() => {
  routes = {
    "GET /clt/me": [200, ME],
    "GET /admin/announcements-list": [
      200,
      { Success: true, rows: [row("a", { display_order: 2 }), row("b", { priority: "critical", display_order: 5 }), row("c", { is_active: false })], table_missing: false },
    ],
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
      <AlertsProvider>
        <AdminAnnouncementsWindow />
      </AlertsProvider>
    </MemberProvider>,
  );
const sent = (path: string) =>
  vi
    .mocked(fetch)
    .mock.calls.filter(([u]) => String(u).endsWith(path))
    .map(([, init]) => JSON.parse(String(init?.body)));
const titles = () => screen.getAllByRole("article").map((a) => a.querySelector("h3")?.textContent);

describe("Admin: Announcements", () => {
  it("lists every announcement, important first, inactive ones marked", async () => {
    open();
    await screen.findByRole("article", { name: "Notice b" });
    expect(titles()).toEqual(["Notice b", "Notice c", "Notice a"]);
    expect(within(screen.getByRole("article", { name: "Notice c" })).getByText("Inactive")).toBeTruthy();
    expect(within(screen.getByRole("article", { name: "Notice c" })).queryByRole("button", { name: "Take down" })).toBeNull();
  });

  it("posts a new announcement", async () => {
    routes["POST /admin/announcements-create"] = [200, { Success: true, row: row("d", { title: "Dues", body: "Pay up", priority: "critical", display_order: 0 }) }];
    open();
    fireEvent.click(await screen.findByRole("button", { name: "New announcement" }));
    const post = screen.getByRole("button", { name: "Post" });
    expect(post).toHaveProperty("disabled", true);
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: " Dues " } });
    fireEvent.change(screen.getByLabelText("Message"), { target: { value: "Pay up" } });
    fireEvent.click(screen.getByLabelText(/Important/));
    fireEvent.click(post);

    expect(await screen.findByRole("article", { name: "Dues" })).toBeTruthy();
    expect(titles()[0]).toBe("Dues");
    expect(sent("/admin/announcements-create")).toEqual([
      { title: "Dues", body: "Pay up", priority: "critical", expires_at: null, is_active: true, display_order: 0 },
    ]);
  });

  it("sends only the edited fields", async () => {
    routes["POST /admin/announcements-update"] = [200, { Success: true, row: row("a", { title: "Renamed", display_order: 2 }) }];
    open();
    fireEvent.click(within(await screen.findByRole("article", { name: "Notice a" })).getByRole("button", { name: "Edit" }));
    const form = screen.getByRole("form", { name: 'Edit "Notice a"' });
    expect(within(form).getByRole("button", { name: "Save" })).toHaveProperty("disabled", true);
    fireEvent.change(within(form).getByLabelText("Title"), { target: { value: "Renamed" } });
    fireEvent.click(within(form).getByRole("button", { name: "Save" }));

    expect(await screen.findByRole("article", { name: "Renamed" })).toBeTruthy();
    expect(sent("/admin/announcements-update")).toEqual([{ id: "a", fields: { title: "Renamed" } }]);
  });

  it("takes one down after the confirmation", async () => {
    routes["POST /admin/announcements-delete"] = [200, { Success: true, row: row("a", { is_active: false, display_order: 2 }) }];
    open();
    fireEvent.click(within(await screen.findByRole("article", { name: "Notice a" })).getByRole("button", { name: "Take down" }));
    fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Take down" }));
    await waitFor(() => expect(within(screen.getByRole("article", { name: "Notice a" })).getByText("Inactive")).toBeTruthy());
    expect(sent("/admin/announcements-delete")).toEqual([{ id: "a" }]);
  });

  it("keeps the form open with the reason when a save is refused", async () => {
    routes["POST /admin/announcements-update"] = [403, { Success: false, Message: "Not authorized" }];
    open();
    fireEvent.click(within(await screen.findByRole("article", { name: "Notice a" })).getByRole("button", { name: "Edit" }));
    fireEvent.change(screen.getByLabelText("Message"), { target: { value: "New body" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect((await screen.findByRole("alert")).textContent).toBe("Couldn’t save: Not authorized");
    expect(screen.getByRole("button", { name: "Save" })).toHaveProperty("disabled", false);
  });

  it("shows an empty list and a failed load", async () => {
    routes["GET /admin/announcements-list"] = [200, { Success: true, rows: [], table_missing: true }];
    const { unmount } = open();
    expect(await screen.findByText(/No announcements yet/)).toBeTruthy();
    unmount();
    routes["GET /admin/announcements-list"] = [403, { Success: false, Message: "Not authorized" }];
    open();
    expect((await screen.findByRole("alert")).textContent).toBe("Couldn’t load announcements: Not authorized");
  });
});
