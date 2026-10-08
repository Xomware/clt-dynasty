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
// The hub's real cards fetch half the API, and the bespoke bodies read the
// league; these tests are about the shell, so the stand-in windows render.
vi.mock("./BuzzHome", () => ({
  BuzzHome: ({ ref, phone }: { ref?: React.Ref<HTMLHeadingElement>; phone?: boolean }) => {
    const Title = phone ? "h2" : "h1";
    return (
      <div>
        <Title ref={ref} tabIndex={-1}>
          Buzz City&rsquo;s Dynasty League
        </Title>
        <p>home body</p>
      </div>
    );
  },
}));
vi.mock("./bodies", async () => ({ BODIES: { folder: (await import("./GroupPage")).GroupPage } }));
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
const sheet = (name: string) => within(screen.getByRole("dialog", { name }));
const dock = () => within(screen.getByRole("navigation", { name: "Primary" }));

describe("Buzz City phone", () => {
  it("welcomes a member with Buzz City's directions, not XP's", async () => {
    await renderPhone();
    expect(screen.getByText(/in the nav, and search finds any team or player/)).toBeTruthy();
    expect(screen.queryByText(/double-click/)).toBeNull();
  });

  it("opens on Home under the bar, its hero a step below the bar's title", async () => {
    await renderPhone();
    expect(bar().textContent).toBe("CLT Dynasty");
    expect(screen.getByRole("heading", { level: 2, name: /Dynasty League/ })).toBeTruthy();
    expect(screen.getByText("home body")).toBeTruthy();
    expect(screen.queryByRole("navigation", { name: "Programs" })).toBeNull();
  });

  it("offers the weekly pages and More in the tab bar, marking the one showing", async () => {
    await renderPhone();
    expect(dock().getAllByRole("button").map((b) => b.textContent)).toEqual(["Home", "Standings", "More"]);
    expect(dock().getByRole("button", { name: "Home" }).getAttribute("aria-current")).toBe("page");

    fireEvent.click(dock().getByRole("button", { name: "Standings" }));
    expect(bar().textContent).toBe("League Standings");
    expect(dock().getByRole("button", { name: "Standings" }).getAttribute("aria-current")).toBe("page");
    fireEvent.click(dock().getByRole("button", { name: "Standings" }));
    expect(window.location.search).toBe("?open=standings");
    expect(bar().textContent).toBe("League Standings");
  });

  it("lists every group's pages under More and opens one as a screen Back closes", async () => {
    await renderPhone();
    fireEvent.click(dock().getByRole("button", { name: "More" }));
    expect(dock().getByRole("button", { name: "More" }).getAttribute("aria-expanded")).toBe("true");
    const league = within(sheet("More").getByRole("region", { name: "League" }));
    expect(league.getAllByRole("button").map((b) => b.textContent)).toEqual(["Standings", "Broken"]);

    fireEvent.click(league.getByRole("button", { name: "Standings" }));
    expect(bar().textContent).toBe("League Standings");
    expect(window.location.search).toBe("?open=standings");
    expect(dock().getByRole("button", { name: "More" }).getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(screen.getByRole("button", { name: /^Back to/ }));
    await waitFor(() => expect(bar().textContent).toBe("CLT Dynasty"));
  });

  it("marks More for a page off the tab bar", async () => {
    window.history.replaceState(null, "", "/?open=broken");
    await renderPhone();
    expect(dock().getByRole("button", { name: "More" }).getAttribute("aria-current")).toBe("page");
    expect(dock().getByRole("button", { name: "Home" }).getAttribute("aria-current")).toBeNull();
  });

  it("shows the logo on Home and Back in its place on other screens", async () => {
    window.history.replaceState(null, "", "/?open=standings");
    await renderPhone();
    expect(screen.queryByRole("button", { name: "CLT Dynasty, home" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Back to Home" }));
    await waitFor(() => expect(bar().textContent).toBe("CLT Dynasty"));
    expect(screen.getByRole("button", { name: "CLT Dynasty, home" })).toBeTruthy();
  });

  it("tucks both bars away on a scroll down and back on a scroll up", async () => {
    await renderPhone();
    const top = () => document.querySelector(".bz-phone-top")!;
    const scrollTo = async (y: number) => {
      Object.defineProperty(window, "scrollY", { configurable: true, value: y });
      fireEvent.scroll(window);
      await new Promise((r) => requestAnimationFrame(r));
    };
    await scrollTo(400);
    await waitFor(() => expect(top().hasAttribute("data-tucked")).toBe(true));
    expect(dock().getByRole("button", { name: "More" }).closest("nav")!.hasAttribute("data-tucked")).toBe(true);
    await scrollTo(300);
    await waitFor(() => expect(top().hasAttribute("data-tucked")).toBe(false));
    Object.defineProperty(window, "scrollY", { configurable: true, value: 0 });
  });

  it("drills inside a screen and backs out a step at a time", async () => {
    window.history.replaceState(null, "", "/?open=standings");
    await renderPhone();
    fireEvent.click(screen.getByRole("button", { name: "Team 6" }));
    expect(bar().textContent).toBe("Team 6");
    fireEvent.click(screen.getByRole("button", { name: /^Back to/ }));
    await waitFor(() => expect(bar().textContent).toBe("League Standings"));
  });

  it("names where Back goes, and keeps the screen under the top one as it was left", async () => {
    window.history.replaceState(null, "", "/?open=standings");
    await renderPhone();
    const team = screen.getByRole("button", { name: "Team 6" });
    Object.defineProperty(window, "scrollY", { configurable: true, value: 300 });
    fireEvent.click(team);
    Object.defineProperty(window, "scrollY", { configurable: true, value: 0 });
    expect(screen.getByRole("button", { name: /^Back to/ }).textContent).toBe("Back to League Standings");

    fireEvent.click(screen.getByRole("button", { name: "Back to League Standings" }));
    await waitFor(() => expect(bar().textContent).toBe("League Standings"));
    expect(screen.getByRole("button", { name: "Team 6" })).toBe(team);
    expect(document.activeElement).toBe(team);
    expect(window.scrollTo).toHaveBeenLastCalledWith(0, 300);
    expect(screen.getByRole("button", { name: /^Back to/ }).textContent).toBe("Back to Home");
  });

  it("rebuilds the stack when the browser goes Forward", async () => {
    window.history.replaceState(null, "", "/?open=standings");
    await renderPhone();
    fireEvent.click(screen.getByRole("button", { name: "Team 6" }));
    fireEvent.click(screen.getByRole("button", { name: /^Back to/ }));
    await waitFor(() => expect(bar().textContent).toBe("League Standings"));
    window.history.forward();
    await waitFor(() => expect(bar().textContent).toBe("Team 6"));
    expect(screen.getByRole("button", { name: /^Back to/ }).textContent).toBe("Back to League Standings");
  });

  it("goes Back on a swipe from the left edge when installed to the home screen", async () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query === PHONE || query === "(display-mode: standalone)",
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    window.history.replaceState(null, "", "/?open=standings");
    await renderPhone();
    fireEvent.click(screen.getByRole("button", { name: "Team 6" }));
    const main = screen.getByRole("main");
    const touch = (type: string, x: number) =>
      main.dispatchEvent(Object.assign(new Event(type, { bubbles: true, cancelable: true }), { touches: [{ clientX: x, clientY: 400 }] }));
    touch("touchstart", 10);
    touch("touchmove", 60);
    touch("touchmove", 240);
    expect(main.style.transform).toBe("translateX(230px)");
    touch("touchend", 240);
    await waitFor(() => expect(bar().textContent).toBe("League Standings"));
    expect(main.style.transform).toBe("");
  });

  it("holds the theme toggle and sign-out in the account sheet, which Escape closes", async () => {
    await renderPhone();
    fireEvent.click(screen.getByRole("button", { name: "Account" }));
    expect(sheet("Account").getByText("Signed in as Roster 4")).toBeTruthy();
    expect(sheet("Account").getByRole("group", { name: "Theme" })).toBeTruthy();
    expect(sheet("Account").getByRole("button", { name: "Sign out" })).toBeTruthy();
    fireEvent.keyDown(screen.getByRole("dialog", { name: "Account" }), { key: "Escape" });
    expect(screen.getByRole("button", { name: "Account" }).getAttribute("aria-expanded")).toBe("false");
  });

  it("leaves Admin out for members", async () => {
    await renderPhone();
    fireEvent.click(screen.getByRole("button", { name: "Account" }));
    expect(sheet("Account").queryByRole("navigation", { name: "Admin" })).toBeNull();
    expect(sheet("Account").queryByRole("button", { name: "Members" })).toBeNull();
  });

  it("files Admin under an admin's account, not under More", async () => {
    admin.on = true;
    await renderPhone();
    fireEvent.click(dock().getByRole("button", { name: "More" }));
    expect(sheet("More").queryByRole("button", { name: "Members" })).toBeNull();
    fireEvent.keyDown(screen.getByRole("dialog", { name: "More" }), { key: "Escape" });
    fireEvent.click(screen.getByRole("button", { name: "Account" }));
    fireEvent.click(within(sheet("Account").getByRole("navigation", { name: "Admin" })).getByRole("button", { name: "Members" }));
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
