import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

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
// The Home hero reads the league; these tests are about the shell.
vi.mock("@/lib/league/use-league", async (orig) => ({
  ...(await orig<typeof import("@/lib/league/use-league")>()),
  useLeague: () => ({ data: null, myRosterId: null, teamFor: () => ({ name: "", avatarUrl: null }) }),
}));

import { AppShell } from "@/components/AppShell";
import { TIMING } from "@/components/theme/ThemeTransition";
import { MembersIcon } from "@/components/xp/icons";
import { AlertsProvider } from "@/lib/alerts/alerts";
import { REGISTRY } from "@/lib/desktop/registry";
import { MemberProvider } from "@/lib/member/use-member";
import { registerTestWindows } from "@/lib/test/test-windows";
import { ThemeProvider } from "@/lib/theme/theme";
import { ABOUT } from "./pages";
import { UptownShell } from "./UptownShell";

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

afterEach(() => {
  admin.on = false;
  vi.useRealTimers();
  localStorage.clear();
  window.history.replaceState(null, "", "/");
});

async function renderShell(ui = <UptownShell />) {
  render(
    <MemberProvider>
      <AlertsProvider>{ui}</AlertsProvider>
    </MemberProvider>,
  );
  await screen.findByRole("button", { name: "Roster 4, account menu" });
}

const nav = (name: string) => within(screen.getByRole("navigation", { name }));
const title = () => screen.getByRole("heading", { level: 1 });

describe("UptownShell", () => {
  it("files the header nav by group and starts on Home", async () => {
    await renderShell();
    expect(nav("Main").getAllByRole("link").map((a) => a.textContent)).toEqual(["League"]);
    expect(title().textContent).toBe("The Queen City\u2019s dynasty league");
    expect(screen.getByText("home body")).toBeTruthy();
    expect(screen.queryByRole("navigation", { name: "League pages" })).toBeNull();
  });

  it("opens a group on its first page, with the group's pages as a sub-nav", async () => {
    await renderShell();
    fireEvent.click(nav("Main").getByRole("link", { name: "League" }));

    expect(title().textContent).toBe("League Standings");
    expect(window.location.search).toBe("?open=standings");
    expect(document.activeElement).toBe(title());
    expect(nav("Main").getByRole("link", { name: "League" }).getAttribute("aria-current")).toBe("true");
    const pages = nav("League pages");
    expect(pages.getAllByRole("link").map((a) => a.textContent)).toEqual(["Standings", "Broken"]);
    expect(pages.getByRole("link", { name: "Standings" }).getAttribute("aria-current")).toBe("page");
  });

  it("drills in place under the same group, and Back returns", async () => {
    window.history.replaceState(null, "", "/?open=standings");
    await renderShell();
    fireEvent.click(screen.getByRole("button", { name: "Team 6" }));

    expect(title().textContent).toBe("Team 6");
    expect(window.location.search).toBe("?open=team:6");
    expect(nav("League pages")).toBeTruthy();

    act(() => {
      window.history.replaceState(null, "", "/?open=standings");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(title().textContent).toBe("League Standings");
  });

  it("opens the XP desktop's front window from a multi-window link", async () => {
    window.history.replaceState(null, "", "/?open=home,standings");
    await renderShell();
    expect(title().textContent).toBe("League Standings");
  });

  it("shows a folder link as the group's page of cards", async () => {
    window.history.replaceState(null, "", "/?open=folder:league");
    await renderShell();
    expect(title().textContent).toBe("League");
    const card = screen.getByRole("button", { name: "Standings" });
    expect(card.getAttribute("aria-describedby") && document.getElementById(card.getAttribute("aria-describedby")!)?.textContent).toBe(ABOUT.standings);
    fireEvent.click(card);
    expect(title().textContent).toBe("League Standings");
  });

  it("keeps a page that throws inside its panel", async () => {
    window.history.replaceState(null, "", "/?open=broken");
    vi.spyOn(console, "error").mockImplementation(() => {});
    await renderShell();
    expect(screen.getByRole("alert").textContent).toMatch(/hit an error/);
    expect(nav("Main")).toBeTruthy();
  });

  it("keeps Admin out of the header and in an admin's account menu", async () => {
    admin.on = true;
    await renderShell();
    expect(nav("Main").getAllByRole("link").map((a) => a.textContent)).toEqual(["League"]);
    fireEvent.click(screen.getByRole("button", { name: "Roster 4, account menu" }));
    fireEvent.click(within(screen.getByRole("list", { name: "Admin" })).getByRole("link", { name: "Members" }));

    expect(title().textContent).toBe("Admin: Members");
    expect(window.location.search).toBe("?open=members");
    expect(nav("Admin pages").getAllByRole("link").map((a) => a.textContent)).toEqual(["Members"]);
  });

  it("gives a member no Admin in the account menu", async () => {
    await renderShell();
    fireEvent.click(screen.getByRole("button", { name: "Roster 4, account menu" }));
    expect(screen.queryByRole("list", { name: "Admin" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Members" })).toBeNull();
  });

  it("puts the member's pages, the theme and sign-out in the account menu", async () => {
    await renderShell();
    fireEvent.click(screen.getByRole("button", { name: "Roster 4, account menu" }));
    const menu = nav("Account");
    expect(menu.getByRole("group", { name: "Theme" })).toBeTruthy();
    expect(menu.getByRole("button", { name: "Sign out" })).toBeTruthy();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("navigation", { name: "Account" })).toBeNull();
  });
});

describe("Spotlight", () => {
  it("opens on Ctrl+K, filters every page by group, and opens the pick", async () => {
    await renderShell();
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    const dialog = within(screen.getByRole("dialog", { name: "Search every page" }));
    expect(dialog.getByRole("group", { name: "Start" })).toBeTruthy();
    expect(dialog.getByRole("option", { name: "Home" })).toBeTruthy();
    expect(within(dialog.getByRole("group", { name: "League" })).getAllByRole("option").map((o) => o.getAttribute("aria-label"))).toEqual([
      "Standings",
      "Broken",
    ]);

    fireEvent.change(dialog.getByRole("combobox"), { target: { value: "stand" } });
    // Home's one-liner mentions the standings; a name match still ranks first.
    expect(dialog.getAllByRole("option").map((o) => o.getAttribute("aria-label"))).toEqual(["Standings", "Home"]);
    fireEvent.keyDown(dialog.getByRole("combobox"), { key: "Enter" });

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(title().textContent).toBe("League Standings");
  });

  it("moves with the arrows, says when nothing matches, and closes on Escape", async () => {
    await renderShell();
    const opener = screen.getByRole("button", { name: /^Search/ });
    fireEvent.click(opener);
    const box = screen.getByRole("combobox");
    fireEvent.keyDown(box, { key: "ArrowDown" });
    expect(screen.getByRole("option", { selected: true }).getAttribute("aria-label")).toBe("Standings");

    fireEvent.change(box, { target: { value: "zzz" } });
    expect(screen.getByRole("status").textContent).toContain("No page matches");

    fireEvent.keyDown(box, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(opener);
  });
});

describe("AppShell themes", () => {
  it("swaps the XP desktop for Uptown from the tray, and back from the account menu", async () => {
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

    vi.useFakeTimers();
    fireEvent.click(screen.getByRole("button", { name: "Switch to the Uptown theme" }));
    act(() => vi.advanceTimersByTime(TIMING.uptown.total));
    expect(screen.getByRole("navigation", { name: "Main" })).toBeTruthy();
    expect(screen.queryByRole("list", { name: "Desktop" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Roster 4, account menu" }));
    fireEvent.click(screen.getByRole("button", { name: "Classic XP" }));
    act(() => vi.advanceTimersByTime(TIMING.xp.total));
    expect(screen.getByRole("list", { name: "Desktop" })).toBeTruthy();
    expect(localStorage.getItem("clt.theme")).toBe("xp");
  });
});
