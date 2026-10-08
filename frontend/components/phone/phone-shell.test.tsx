import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const admin = vi.hoisted(() => ({ on: false }));
vi.mock("@/lib/api/clt", () => ({
  getCltMe: vi.fn(async () => ({
    member: { email: "member@example.com", displayName: "Roster 4", role: "member", sleeperUserId: "" },
    linkedSleeperUserId: "",
    isAdmin: admin.on,
  })),
}));
vi.mock("aws-amplify/auth", () => ({ signOut: vi.fn(), getCurrentUser: vi.fn(), fetchAuthSession: vi.fn() }));
vi.mock("aws-amplify/utils", () => ({ Hub: { listen: vi.fn(() => () => {}) } }));

import { AppShell } from "@/components/AppShell";
import { MembersIcon } from "@/components/xp/icons";
import { AlertsProvider } from "@/lib/alerts/alerts";
import { REGISTRY } from "@/lib/desktop/registry";
import { MemberProvider } from "@/lib/member/use-member";
import { registerTestWindows } from "@/lib/test/test-windows";
import { PHONE } from "@/lib/use-media-query";

registerTestWindows();

beforeAll(() => {
  REGISTRY.members = {
    group: "admin",
    label: "Members",
    title: "Admin: Members",
    Icon: MembersIcon,
    component: () => <p>members body</p>,
    defaultSize: { w: 400, h: 400 },
    adminOnly: true,
  };
});
afterAll(() => {
  delete REGISTRY.members;
});

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
const openStandings = () => {
  fireEvent.click(programs().getByRole("button", { name: /^League/ }));
  fireEvent.click(within(screen.getByRole("region", { name: "League" })).getByRole("button", { name: "Standings" }));
};

beforeEach(() => {
  phone(true);
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});
afterEach(() => {
  admin.on = false;
  phone(false);
  vi.restoreAllMocks();
  window.history.replaceState(null, "", "/");
});

describe("phone shell", () => {
  it("lists Home and the groups instead of the desktop, without drill-only windows", async () => {
    await renderPhone();
    expect(programs().getAllByRole("button").map((b) => b.textContent)).toEqual(["Home", "LeagueStandings, Broken"]);
    expect(screen.queryByRole("list", { name: "Desktop" })).toBeNull();
  });

  it("greets with the phone's directions, not the desktop's double-click", async () => {
    await renderPhone();
    expect(await screen.findByText(/Every program is under Start/)).toBeTruthy();
    expect(screen.queryByText(/double-click/)).toBeNull();
  });

  it("lists Admin under an admin's account, apart from Programs", async () => {
    admin.on = true;
    await renderPhone();
    expect(programs().queryByRole("button", { name: /Admin|Members/ })).toBeNull();
    fireEvent.click(within(screen.getByRole("navigation", { name: "Admin" })).getByRole("button", { name: "Members" }));
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Admin: Members");
  });

  it("opens a group, then a program from it, each as a history entry Back closes", async () => {
    await renderPhone();
    fireEvent.click(programs().getByRole("button", { name: /^League/ }));
    const folder = screen.getByRole("region", { name: "League" });
    expect(window.location.search).toBe("?open=folder:league");

    fireEvent.click(within(folder).getByRole("button", { name: "Standings" }));
    const win = screen.getByRole("region", { name: "League Standings" });
    expect(screen.queryByRole("navigation", { name: "Programs" })).toBeNull();
    expect(window.location.search).toBe("?open=standings");

    fireEvent.click(within(win).getByRole("button", { name: /^Back to/ }));
    expect(await screen.findByRole("region", { name: "League" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /^Back to/ }));
    await waitFor(() => expect(screen.getByRole("navigation", { name: "Programs" })).toBeTruthy());
    expect(window.location.search).toBe("");
  });

  it("drills into a new screen and backs out one step at a time", async () => {
    await renderPhone();
    openStandings();
    fireEvent.click(screen.getByRole("button", { name: "Team 6" }));

    expect(screen.getByRole("region", { name: "Team 6" })).toBeTruthy();
    expect(window.location.search).toBe("?open=team:6");

    fireEvent.click(screen.getByRole("button", { name: /^Back to/ }));
    expect(await screen.findByRole("region", { name: "League Standings" })).toBeTruthy();
  });

  it("names the screen Back returns to, kept as it was left", async () => {
    await renderPhone();
    openStandings();
    const team = screen.getByRole("button", { name: "Team 6" });
    fireEvent.click(team);
    fireEvent.click(screen.getByRole("button", { name: "Back to League Standings" }));
    expect(await screen.findByRole("region", { name: "League Standings" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Team 6" })).toBe(team);
    expect(document.activeElement).toBe(team);
  });

  it("goes straight home from Start", async () => {
    await renderPhone();
    openStandings();
    fireEvent.click(screen.getByRole("button", { name: "Team 6" }));

    fireEvent.click(screen.getByRole("button", { name: /start/i }));
    await waitFor(() => expect(screen.getByRole("navigation", { name: "Programs" })).toBeTruthy());
  });

  it("opens a destination from the taskbar and marks it", async () => {
    await renderPhone();
    const taskbar = () => within(screen.getByRole("navigation", { name: "Taskbar" }));
    expect(taskbar().getAllByRole("button").map((b) => b.textContent)).toEqual(["start", "Home", "Standings"]);
    fireEvent.click(taskbar().getByRole("button", { name: "Standings" }));
    expect(screen.getByRole("region", { name: "League Standings" })).toBeTruthy();
    expect(taskbar().getByRole("button", { name: "Standings" }).getAttribute("aria-current")).toBe("page");
    fireEvent.click(taskbar().getByRole("button", { name: "Standings" }));
    expect(window.location.search).toBe("?open=standings");
  });

  it("searches full-screen from the title bar and opens the pick", async () => {
    await renderPhone();
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "broken" } });
    fireEvent.keyDown(screen.getByRole("combobox"), { key: "Enter" });
    expect(screen.queryByRole("combobox")).toBeNull();
    expect(screen.getByRole("region", { name: "Broken" })).toBeTruthy();
  });

  // Chromium's scrollTo returns a promise now; an effect handing it back as its
  // cleanup threw "destroy is not a function" on the next screen change.
  it("survives a scrollTo that returns a promise", async () => {
    vi.mocked(window.scrollTo).mockImplementation((() => Promise.resolve()) as typeof window.scrollTo);
    const failed = vi.fn();
    window.addEventListener("error", failed);
    await renderPhone();
    openStandings();
    fireEvent.click(screen.getByRole("button", { name: "Team 6" }));
    expect(screen.getByRole("region", { name: "Team 6" })).toBeTruthy();
    window.removeEventListener("error", failed);
    expect(failed).not.toHaveBeenCalled();
  });

  it("opens a deep link full-screen, and Back stays on the site", async () => {
    window.history.replaceState(null, "", "/?open=team:3");
    mount();
    expect(await screen.findByRole("region", { name: "Team 3" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /^Back to/ }));
    expect(screen.getByRole("navigation", { name: "Programs" })).toBeTruthy();
    expect(window.location.search).toBe("");
  });
});
