import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("aws-amplify/auth", () => ({
  fetchAuthSession: vi.fn(async () => ({ tokens: { idToken: { toString: () => "id-token" } } })),
}));

import { AlertsProvider } from "@/lib/alerts/alerts";
import type { PlatformUser } from "@/lib/api/me";
import { SettingsWindow } from "./SettingsWindow";

const UNLINKED: PlatformUser = {
  userId: "sub-1",
  email: "member@example.com",
  sleeperUserId: "",
  sleeperUsername: "",
  sleeperAvatar: "",
  displayName: "",
  hasLinkedSleeper: false,
  createdAt: "",
  updatedAt: "",
};
const LINKED: PlatformUser = { ...UNLINKED, sleeperUserId: "400", sleeperUsername: "queencity", hasLinkedSleeper: true };
const ROSTERS = [
  { roster_id: 3, owner_id: "300", co_owners: ["400"] },
  { roster_id: 5, owner_id: "500", co_owners: null },
];

type Reply = [number, unknown];
let routes: Record<string, Reply | (() => Reply)>;
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });

beforeEach(() => {
  routes = { "GET /me/profile": [200, { user: UNLINKED }], "GET rosters": [200, ROSTERS] };
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = String(input);
    const key = url.includes("api.sleeper.app") ? "GET rosters" : `${init?.method ?? "GET"} ${new URL(url).pathname}`;
    const hit = routes[key];
    if (!hit) throw new Error(`unmocked ${key}`);
    const [status, body] = typeof hit === "function" ? hit() : hit;
    return json(status, body);
  });
});
afterEach(() => {
  vi.restoreAllMocks();
});

const renderSettings = () =>
  render(
    <AlertsProvider>
      <SettingsWindow params={{}} />
    </AlertsProvider>,
  );
const calls = (path: string) => vi.mocked(fetch).mock.calls.filter(([u]) => String(u).endsWith(path));

describe("Settings: Sleeper link", () => {
  it("links a Sleeper username and then checks it owns a team", async () => {
    routes["PUT /me/sleeper-link"] = [200, { user: LINKED }];
    renderSettings();

    const input = await screen.findByLabelText("Sleeper username");
    const link = screen.getByRole("button", { name: "Link" });
    expect(link).toHaveProperty("disabled", true);
    fireEvent.change(input, { target: { value: " queencity " } });
    fireEvent.click(link);

    expect(await screen.findByText("queencity")).toBeTruthy();
    expect(JSON.parse(String(calls("/me/sleeper-link")[0][1]?.body))).toEqual({ sleeperUsername: "queencity" });
    expect((await screen.findByText(/manages roster 3/i)).textContent).toMatch(/roster 3/);
  });

  it("shows Xomper's reason when the username doesn't exist, and keeps the form", async () => {
    routes["PUT /me/sleeper-link"] = [400, { error: { message: "No Sleeper account found for 'nobody'" } }];
    renderSettings();
    fireEvent.change(await screen.findByLabelText("Sleeper username"), { target: { value: "nobody" } });
    fireEvent.click(screen.getByRole("button", { name: "Link" }));

    expect((await screen.findByRole("alert")).textContent).toBe("No Sleeper account found for 'nobody'");
    expect(screen.getByLabelText("Sleeper username").getAttribute("aria-invalid")).toBe("true");
  });

  it("warns when the linked account owns no team in the league", async () => {
    routes["GET /me/profile"] = [200, { user: { ...LINKED, sleeperUserId: "999" } }];
    renderSettings();
    expect((await screen.findByRole("alert")).textContent).toMatch(/doesn’t own a team in the CLT Dynasty League/);
  });

  it("says so when Sleeper can't be reached for the roster check", async () => {
    routes["GET /me/profile"] = [200, { user: LINKED }];
    routes["GET rosters"] = [503, {}];
    renderSettings();
    expect(await screen.findByText(/couldn’t reach sleeper/i)).toBeTruthy();
  });

  it("unlinks only after the confirmation", async () => {
    routes["GET /me/profile"] = [200, { user: LINKED }];
    routes["DELETE /me/sleeper-unlink"] = [200, { user: UNLINKED }];
    renderSettings();

    fireEvent.click(await screen.findByRole("button", { name: "Unlink" }));
    const dialog = screen.getByRole("alertdialog", { name: "Unlink Sleeper" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(calls("/me/sleeper-unlink")).toHaveLength(0);

    fireEvent.click(screen.getByRole("button", { name: "Unlink" }));
    fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Unlink" }));
    expect(await screen.findByLabelText("Sleeper username")).toBeTruthy();
    expect(calls("/me/sleeper-unlink")).toHaveLength(1);
  });

  it("shows a failed profile load and retries it", async () => {
    let fail = true;
    routes["GET /me/profile"] = () => (fail ? [500, { error: { message: "Internal server error" } }] : [200, { user: UNLINKED }]);
    renderSettings();

    expect((await screen.findByRole("alert")).textContent).toMatch(/internal server error/i);
    fail = false;
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByLabelText("Sleeper username")).toBeTruthy();
  });
});
