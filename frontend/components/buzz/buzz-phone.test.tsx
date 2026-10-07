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
vi.mock("@/lib/league/use-league", async (orig) => ({
  ...(await orig<typeof import("@/lib/league/use-league")>()),
  useLeague: () => ({ data: null, myRosterId: null, teamFor: () => ({ name: "", avatarUrl: null }) }),
}));

import { AppShell } from "@/components/AppShell";
import { MembersIcon } from "@/components/xp/icons";
import { AlertsProvider } from "@/lib/alerts/alerts";
import { REGISTRY } from "@/lib/desktop/registry";
import { MemberProvider } from "@/lib/member/use-member";
import { registerTestWindows } from "@/lib/test/test-windows";
import { THEME_KEY } from "@/lib/theme/script";
import { ThemeProvider } from "@/lib/theme/theme";
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

beforeEach(() => {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query === PHONE,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  localStorage.setItem(THEME_KEY, "buzz");
});
afterEach(() => {
  admin.on = false;
  localStorage.clear();
  vi.restoreAllMocks();
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: false, media: query, addEventListener: () => {}, removeEventListener: () => {} }));
  window.history.replaceState(null, "", "/");
});

async function renderPhone() {
  render(
    <ThemeProvider>
      <MemberProvider>
        <AlertsProvider>
          <AppShell />
        </AlertsProvider>
      </MemberProvider>
    </ThemeProvider>,
  );
  await screen.findByText("Welcome back, Roster 4");
}

const bar = () => screen.getByRole("heading", { level: 1 });
const drawer = () => within(screen.getByRole("dialog", { name: "Menu" }));

describe("Buzz City phone", () => {
  it("opens on Home under the bar", async () => {
    await renderPhone();
    expect(bar().textContent).toBe("CLT Dynasty");
    expect(screen.getByText("home body")).toBeTruthy();
    expect(screen.queryByRole("navigation", { name: "Programs" })).toBeNull();
  });

  it("offers the weekly pages in the tab bar, marking the one showing", async () => {
    await renderPhone();
    const dock = () => within(screen.getByRole("navigation", { name: "Quick" }));
    expect(dock().getAllByRole("button").map((b) => b.textContent)).toEqual(["Home", "Standings"]);
    expect(dock().getByRole("button", { name: "Home" }).getAttribute("aria-current")).toBe("page");

    fireEvent.click(dock().getByRole("button", { name: "Standings" }));
    expect(bar().textContent).toBe("League Standings");
    expect(dock().getByRole("button", { name: "Standings" }).getAttribute("aria-current")).toBe("page");
    fireEvent.click(dock().getByRole("button", { name: "Standings" }));
    expect(window.location.search).toBe("?open=standings");
    expect(bar().textContent).toBe("League Standings");
  });

  it("lists every group's pages in the menu and opens one as a screen Back closes", async () => {
    await renderPhone();
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    expect(screen.getByRole("button", { name: "Menu" }).getAttribute("aria-expanded")).toBe("true");
    const league = within(drawer().getByRole("region", { name: "League" }));
    expect(league.getAllByRole("button").map((b) => b.textContent)).toEqual(["Standings", "Broken"]);
    expect(drawer().getByRole("button", { name: "Home" }).getAttribute("aria-current")).toBe("page");

    fireEvent.click(league.getByRole("button", { name: "Standings" }));
    expect(bar().textContent).toBe("League Standings");
    expect(window.location.search).toBe("?open=standings");
    expect(screen.getByRole("button", { name: "Menu" }).getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    await waitFor(() => expect(bar().textContent).toBe("CLT Dynasty"));
  });

  it("drills inside a screen and backs out a step at a time", async () => {
    window.history.replaceState(null, "", "/?open=standings");
    await renderPhone();
    fireEvent.click(screen.getByRole("button", { name: "Team 6" }));
    expect(bar().textContent).toBe("Team 6");
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    await waitFor(() => expect(bar().textContent).toBe("League Standings"));
  });

  it("closes the menu on Escape and holds the theme toggle and sign-out", async () => {
    await renderPhone();
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    expect(drawer().getByRole("group", { name: "Theme" })).toBeTruthy();
    expect(drawer().getByRole("button", { name: "Sign out" })).toBeTruthy();
    fireEvent.keyDown(screen.getByRole("dialog", { name: "Menu" }), { key: "Escape" });
    expect(screen.getByRole("button", { name: "Menu" }).getAttribute("aria-expanded")).toBe("false");
  });

  it("leaves Admin out for members", async () => {
    await renderPhone();
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    expect(drawer().queryByRole("navigation", { name: "Admin" })).toBeNull();
    expect(drawer().queryByRole("button", { name: "Members" })).toBeNull();
  });

  it("files Admin under an admin's account, not the page groups", async () => {
    admin.on = true;
    await renderPhone();
    fireEvent.click(screen.getByRole("button", { name: "Menu" }));
    expect(within(drawer().getByRole("navigation", { name: "Pages" })).queryByRole("button", { name: "Members" })).toBeNull();
    const account = within(drawer().getByRole("region", { name: "Account" }));
    fireEvent.click(within(account.getByRole("navigation", { name: "Admin" })).getByRole("button", { name: "Members" }));
    expect(bar().textContent).toBe("Admin: Members");
  });

  it("searches from the bar", async () => {
    await renderPhone();
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "broken" } });
    fireEvent.keyDown(screen.getByRole("combobox"), { key: "Enter" });
    expect(bar().textContent).toBe("Broken");
  });

  it("opens a folder link as the group's cards", async () => {
    window.history.replaceState(null, "", "/?open=folder:league");
    await renderPhone();
    expect(bar().textContent).toBe("League");
    fireEvent.click(within(screen.getByRole("main")).getByRole("button", { name: "Standings" }));
    expect(bar().textContent).toBe("League Standings");
  });

  it("gives the XP phone a theme toggle above the account", async () => {
    localStorage.setItem(THEME_KEY, "xp");
    await renderPhone();
    const theme = within(screen.getByRole("region", { name: "Theme" }));
    expect(theme.getByRole("button", { name: "Classic XP" }).getAttribute("aria-pressed")).toBe("true");
  });
});
