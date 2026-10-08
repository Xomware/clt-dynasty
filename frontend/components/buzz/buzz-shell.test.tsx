import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { useContext } from "react";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

const admin = vi.hoisted(() => ({ on: false }));
const league = vi.hoisted(() => ({ rosters: null as { roster_id: number }[] | null }));

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
// The Home hero reads the league; these tests are about the shell.
vi.mock("@/lib/league/use-league", async (orig) => ({
  ...(await orig<typeof import("@/lib/league/use-league")>()),
  useLeague: () => ({
    data: league.rosters && { rosters: league.rosters, league: { status: "pre_draft", settings: { playoff_week_start: 15, playoff_teams: 6 } }, nfl: { week: 1 } },
    myRosterId: null,
    teamFor: (id: number) => ({ name: `Queen City ${id}`, avatarUrl: null }),
  }),
}));

import { AppShell } from "@/components/AppShell";
import { TIMING } from "@/components/theme/ThemeTransition";
import { MembersIcon } from "@/components/xp/icons";
import { AlertsProvider } from "@/lib/alerts/alerts";
import { NavigateContext } from "@/lib/desktop/navigation";
import { REGISTRY } from "@/lib/desktop/registry";
import { useViewLabel } from "@/lib/nav/label";
import { MemberProvider } from "@/lib/member/use-member";
import { registerTestWindows } from "@/lib/test/test-windows";
import { ThemeProvider } from "@/lib/theme/theme";
import { ABOUT, RELATED } from "./pages";

const RELATED_TEST = RELATED as Record<string, string[]>;
const standingsNext = RELATED_TEST.standings;
import { BuzzShell } from "./BuzzShell";

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
  league.rosters = null;
  vi.useRealTimers();
  localStorage.clear();
  window.history.replaceState(null, "", "/");
});

async function renderShell(ui = <BuzzShell />) {
  render(
    <MemberProvider>
      <AlertsProvider>{ui}</AlertsProvider>
    </MemberProvider>,
  );
  await screen.findByRole("button", { name: "Roster 4, account menu" });
}

const nav = (name: string) => within(screen.getByRole("navigation", { name }));
const title = () => screen.getByRole("heading", { level: 1 });

describe("BuzzShell", () => {
  it("files the header nav by group and starts on Home", async () => {
    await renderShell();
    expect(nav("Main").getAllByRole("link").map((a) => a.textContent)).toEqual(["Home", "League"]);
    expect(nav("Main").getByRole("link", { name: "Home" }).getAttribute("aria-current")).toBe("page");
    expect(title().textContent).toBe("Buzz City\u2019s Dynasty League");
    expect(screen.getByText("home body")).toBeTruthy();
    expect(screen.queryByRole("navigation", { name: "League pages" })).toBeNull();
  });

  // Home's hero carries the lockup, so the header wears the seal instead.
  it("brands the header with the league seal, linked home", async () => {
    await renderShell();
    const brand = screen.getByRole("link", { name: "CLT Dynasty Fantasy Football, home" });
    expect(brand.querySelector("img")?.getAttribute("srcset")).toMatch(/seal.* 1x, .*seal@2x.* 2x/);
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

  it("heads a page with its breadcrumb and ends it with where to go next", async () => {
    window.history.replaceState(null, "", "/?open=broken");
    vi.spyOn(console, "error").mockImplementation(() => {});
    await renderShell();
    const crumbs = nav("Breadcrumb");
    expect(crumbs.getAllByRole("listitem").map((li) => li.textContent)).toEqual(["Home", "League", "Broken"]);
    fireEvent.click(crumbs.getByRole("link", { name: "League" }));
    expect(title().textContent).toBe("League Standings");

    RELATED_TEST.standings = ["broken"];
    fireEvent.click(nav("League pages").getByRole("link", { name: "Broken" }));
    fireEvent.click(nav("League pages").getByRole("link", { name: "Standings" }));
    fireEvent.click(nav("Keep going").getByRole("link", { name: /^Broken/ }));
    expect(title().textContent).toBe("Broken");
    fireEvent.click(nav("Breadcrumb").getByRole("link", { name: "Home" }));
    expect(window.location.search).toBe("");
    RELATED_TEST.standings = standingsNext;
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
    expect(nav("Main").getAllByRole("link").map((a) => a.textContent)).toEqual(["Home", "League"]);
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

describe("back stack", () => {
  // The stand-in team page drills on to a player who names himself, and the
  // player page on to an NFL team.
  const realTeam = { ...REGISTRY.team };
  beforeAll(() => {
    REGISTRY.team = {
      ...REGISTRY.team,
      component: function TeamBody({ params }) {
        const navigate = useContext(NavigateContext);
        return (
          <button type="button" onClick={() => navigate?.({ kind: "player", params: { playerId: "9" } })}>
            Player of team {params.rosterId}
          </button>
        );
      },
    };
    REGISTRY.player = {
      label: "Player",
      title: "Player 9",
      Icon: MembersIcon,
      component: function PlayerBody() {
        const navigate = useContext(NavigateContext);
        useViewLabel("Jaxon Smith-Njigba");
        return (
          <button type="button" onClick={() => navigate?.({ kind: "nfl", params: { team: "SEA" } })}>
            Seahawks
          </button>
        );
      },
      defaultSize: { w: 400, h: 400 },
      link: (playerId) => ({ playerId }),
      drillOnly: true,
    };
    REGISTRY.nfl = {
      label: "NFL",
      title: "Seattle Seahawks",
      Icon: MembersIcon,
      component: () => <p>depth chart</p>,
      defaultSize: { w: 400, h: 400 },
      link: (team) => ({ team }),
      drillOnly: true,
    };
  });
  afterAll(() => {
    REGISTRY.team = realTeam;
    delete REGISTRY.player;
    delete REGISTRY.nfl;
  });

  const crumbs = () => nav("Breadcrumb").getAllByRole("listitem").map((li) => li.textContent);
  const backButton = () => screen.getByRole("button", { name: /^Back to/ });

  async function drillToNfl() {
    window.history.replaceState(null, "", "/?open=standings");
    await renderShell();
    fireEvent.click(screen.getByRole("button", { name: "Team 6" }));
    fireEvent.click(screen.getByRole("button", { name: "Player of team 6" }));
    fireEvent.click(screen.getByRole("button", { name: "Seahawks" }));
  }

  it("pushes a history entry per drill and names the path taken", async () => {
    const before = window.history.length;
    await drillToNfl();
    expect(window.history.length).toBe(before + 3);
    expect(window.location.search).toBe("?open=nfl:SEA");
    expect(crumbs()).toEqual(["Home", "League Standings", "Team 6", "Jaxon Smith-Njigba", "Seattle Seahawks"]);
    expect(backButton().textContent).toBe("Back to Jaxon Smith-Njigba");
  });

  it("walks back a step at a time to each page as it was left", async () => {
    await drillToNfl();
    const team = screen.getByRole("button", { name: "Player of team 6", hidden: true });
    fireEvent.click(backButton());
    await waitFor(() => expect(title().textContent).toBe("Player 9"));
    expect(backButton().textContent).toBe("Back to Team 6");
    fireEvent.click(backButton());
    await waitFor(() => expect(title().textContent).toBe("Team 6"));
    // The page kept mounted, and focus back on the link that left it.
    expect(screen.getByRole("button", { name: "Player of team 6" })).toBe(team);
    expect(document.activeElement).toBe(team);
    expect(crumbs()).toEqual(["Home", "League Standings", "Team 6"]);
    fireEvent.click(backButton());
    await waitFor(() => expect(title().textContent).toBe("League Standings"));
    expect(crumbs()).toEqual(["Home", "League", "League Standings"]);
  });

  it("jumps back several pages from a crumb, through the browser's history", async () => {
    await drillToNfl();
    fireEvent.click(nav("Breadcrumb").getByRole("link", { name: "Team 6" }));
    await waitFor(() => expect(title().textContent).toBe("Team 6"));
    expect(window.location.search).toBe("?open=team:6");
    expect(backButton().textContent).toBe("Back to League Standings");
  });

  it("puts the page back where it was scrolled", async () => {
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    window.history.replaceState(null, "", "/?open=standings");
    await renderShell();
    Object.defineProperty(window, "scrollY", { configurable: true, value: 640 });
    fireEvent.click(screen.getByRole("button", { name: "Team 6" }));
    expect(scrollTo).toHaveBeenLastCalledWith(0, 0);
    fireEvent.click(backButton());
    await waitFor(() => expect(title().textContent).toBe("League Standings"));
    expect(scrollTo).toHaveBeenLastCalledWith(0, 640);
    Object.defineProperty(window, "scrollY", { configurable: true, value: 0 });
  });

  it("starts a new path from the nav, while Back still returns to the page left", async () => {
    window.history.replaceState(null, "", "/?open=standings");
    vi.spyOn(console, "error").mockImplementation(() => {});
    await renderShell();
    fireEvent.click(screen.getByRole("button", { name: "Team 6" }));
    fireEvent.click(nav("League pages").getByRole("link", { name: "Broken" }));
    expect(crumbs()).toEqual(["Home", "League", "Broken"]);
    expect(backButton().textContent).toBe("Back to Team 6");
  });

  it("sends a page opened from a link up to its group", async () => {
    window.history.replaceState(null, "", "/?open=team:6");
    await renderShell();
    expect(backButton().textContent).toBe("Back to Home");
    fireEvent.click(backButton());
    expect(window.location.search).toBe("");
  });

  it("follows the browser's Forward too", async () => {
    await drillToNfl();
    fireEvent.click(backButton());
    await waitFor(() => expect(title().textContent).toBe("Player 9"));
    act(() => window.history.forward());
    await waitFor(() => expect(title().textContent).toBe("Seattle Seahawks"));
    expect(backButton().textContent).toBe("Back to Jaxon Smith-Njigba");
  });
});

describe("Spotlight", () => {
  it("opens on Ctrl+K, filters every page by group, and opens the pick", async () => {
    await renderShell();
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    const dialog = within(screen.getByRole("dialog", { name: "Search pages, teams and NFL players" }));
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

  it("finds a team by name once something is typed, and opens its profile", async () => {
    league.rosters = [{ roster_id: 3 }, { roster_id: 8 }];
    await renderShell();
    fireEvent.keyDown(document, { key: "k", ctrlKey: true });
    const dialog = within(screen.getByRole("dialog", { name: "Search pages, teams and NFL players" }));
    expect(dialog.queryByRole("group", { name: "Teams" })).toBeNull();

    fireEvent.change(dialog.getByRole("combobox"), { target: { value: "queen 8" } });
    expect(within(dialog.getByRole("group", { name: "Teams" })).getAllByRole("option").map((o) => o.getAttribute("aria-label"))).toEqual([
      "Queen City 8",
    ]);
    fireEvent.keyDown(dialog.getByRole("combobox"), { key: "Enter" });
    expect(window.location.search).toBe("?open=team:8");
  });

  it("moves with the arrows, says when nothing matches, and closes on Escape", async () => {
    await renderShell();
    const opener = screen.getByRole("button", { name: /^Search/ });
    fireEvent.click(opener);
    const box = screen.getByRole("combobox");
    fireEvent.keyDown(box, { key: "ArrowDown" });
    expect(screen.getByRole("option", { selected: true }).getAttribute("aria-label")).toBe("Standings");

    fireEvent.change(box, { target: { value: "zzz" } });
    expect(within(screen.getByRole("dialog")).getByRole("status").textContent).toContain("No page, team or player matches");

    fireEvent.keyDown(box, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(opener);
  });
});

describe("AppShell themes", () => {
  it("swaps the XP desktop for Buzz City from the tray, and back from the account menu", async () => {
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
    fireEvent.click(screen.getByRole("button", { name: "Switch to the Buzz City theme" }));
    act(() => vi.advanceTimersByTime(TIMING.buzz.total));
    expect(screen.getByRole("navigation", { name: "Main" })).toBeTruthy();
    expect(screen.queryByRole("list", { name: "Desktop" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Roster 4, account menu" }));
    fireEvent.click(screen.getByRole("button", { name: "Classic XP" }));
    act(() => vi.advanceTimersByTime(TIMING.xp.total));
    expect(screen.getByRole("list", { name: "Desktop" })).toBeTruthy();
    expect(localStorage.getItem("clt.theme")).toBe("xp");
  });
});
