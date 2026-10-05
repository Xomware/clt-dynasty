import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/clt", () => ({
  getCltMe: vi.fn(async () => ({
    member: { email: "member@example.com", displayName: "Roster 4", role: "member", sleeperUserId: "" },
    linkedSleeperUserId: "",
  })),
}));
vi.mock("aws-amplify/auth", () => ({ signOut: vi.fn(), getCurrentUser: vi.fn(), fetchAuthSession: vi.fn() }));
vi.mock("aws-amplify/utils", () => ({ Hub: { listen: vi.fn(() => () => {}) } }));

import { AppShell } from "@/components/AppShell";
import { AlertsProvider } from "@/lib/alerts/alerts";
import { MemberProvider } from "@/lib/member/use-member";
import { registerTestWindows } from "@/lib/test/test-windows";
import { PHONE } from "@/lib/use-media-query";

registerTestWindows();

const phone = (on: boolean) =>
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: on && query === PHONE,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));

const mount = () =>
  render(
    <MemberProvider>
      <AlertsProvider>
        <AppShell />
      </AlertsProvider>
    </MemberProvider>,
  );

const renderPhone = async () => {
  mount();
  await screen.findByText("Signed in as Roster 4");
};

const programs = () => within(screen.getByRole("navigation", { name: "Programs" }));

beforeEach(() => {
  phone(true);
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});
afterEach(() => {
  phone(false);
  vi.restoreAllMocks();
  window.history.replaceState(null, "", "/");
});

describe("phone shell", () => {
  it("lists the programs instead of the desktop, without drill-only windows", async () => {
    await renderPhone();
    expect(programs().getAllByRole("button").map((b) => b.textContent)).toEqual(["Home", "Standings", "Broken"]);
    expect(screen.queryByRole("list", { name: "Desktop" })).toBeNull();
  });

  it("opens a program full-screen as a history entry, and Back closes it", async () => {
    await renderPhone();
    fireEvent.click(programs().getByRole("button", { name: "Standings" }));

    const win = screen.getByRole("region", { name: "League Standings" });
    expect(screen.queryByRole("navigation", { name: "Programs" })).toBeNull();
    expect(window.location.search).toBe("?open=standings");

    fireEvent.click(within(win).getByRole("button", { name: "Back" }));
    await waitFor(() => expect(screen.getByRole("navigation", { name: "Programs" })).toBeTruthy());
    expect(window.location.search).toBe("");
  });

  it("drills into a new screen and backs out one step at a time", async () => {
    await renderPhone();
    fireEvent.click(programs().getByRole("button", { name: "Standings" }));
    fireEvent.click(screen.getByRole("button", { name: "Team 6" }));

    expect(screen.getByRole("region", { name: "Team 6" })).toBeTruthy();
    expect(window.location.search).toBe("?open=team:6");

    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(await screen.findByRole("region", { name: "League Standings" })).toBeTruthy();
  });

  it("goes straight home from Start", async () => {
    await renderPhone();
    fireEvent.click(programs().getByRole("button", { name: "Standings" }));
    fireEvent.click(screen.getByRole("button", { name: "Team 6" }));

    fireEvent.click(screen.getByRole("button", { name: /start/i }));
    await waitFor(() => expect(screen.getByRole("navigation", { name: "Programs" })).toBeTruthy());
  });

  it("opens a deep link full-screen, and Back stays on the site", async () => {
    window.history.replaceState(null, "", "/?open=team:3");
    mount();
    expect(await screen.findByRole("region", { name: "Team 3" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByRole("navigation", { name: "Programs" })).toBeTruthy();
    expect(window.location.search).toBe("");
  });
});
