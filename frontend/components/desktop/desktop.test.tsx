import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/clt", () => ({
  getCltMe: vi.fn(async () => ({
    member: { email: "member@example.com", displayName: "Roster 4", role: "member", sleeperUserId: "" },
    linkedSleeperUserId: "",
  })),
}));
vi.mock("aws-amplify/auth", () => ({ signOut: vi.fn(), getCurrentUser: vi.fn(), fetchAuthSession: vi.fn() }));
vi.mock("aws-amplify/utils", () => ({ Hub: { listen: vi.fn(() => () => {}) } }));

import { signOut } from "aws-amplify/auth";

import { AppShell } from "@/components/AppShell";
import { AlertsProvider } from "@/lib/alerts/alerts";
import { MemberProvider } from "@/lib/member/use-member";
import { registerTestWindows } from "@/lib/test/test-windows";

registerTestWindows();

const renderShell = async () => {
  render(
    <MemberProvider>
      <AlertsProvider>
        <AppShell />
      </AlertsProvider>
    </MemberProvider>,
  );
  await screen.findByText("Welcome back, Roster 4");
};

// Hidden windows drop out of the accessibility tree, so find them by label.
const windowNamed = (name: string) => document.querySelector<HTMLElement>(`section[aria-label="${name}"]`);
const tab = (name: string) => within(screen.getByRole("list", { name: "Open windows" })).getByRole("button", { name });
const icon = (name: string) => within(screen.getByRole("list", { name: "Desktop" })).getByRole("button", { name });
// The stand-in programs live in the League folder.
const launch = (name: string) => {
  if (!windowNamed("League")) fireEvent.doubleClick(icon("League"));
  fireEvent.doubleClick(within(windowNamed("League")!).getByRole("button", { name }));
};
const startMenu = () => within(screen.getByRole("navigation", { name: "Start menu" }));

beforeEach(() => {
  // jsdom has no pointer capture.
  Element.prototype.setPointerCapture = vi.fn();
});
afterEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  // The desktop mirrors its windows into ?open=, which the next render would reopen.
  window.history.replaceState(null, "", "/");
});

describe("desktop", () => {
  it("shows Home and a folder per group, with no drill-only windows", async () => {
    await renderShell();
    const names = within(screen.getByRole("list", { name: "Desktop" }))
      .getAllByRole("button")
      .map((b) => b.textContent);
    expect(names).toEqual(["Home", "League"]);
  });

  it("opens a folder, then a program from it in its own window, mirrored into the URL", async () => {
    await renderShell();
    fireEvent.doubleClick(icon("League"));
    const folder = windowNamed("League")!;
    expect(within(folder).getAllByRole("listitem").map((li) => li.textContent)).toEqual(["Standings", "Broken"]);
    expect(within(folder).getByText("2 objects")).toBeTruthy();

    fireEvent.doubleClick(within(folder).getByRole("button", { name: "Standings" }));
    expect(windowNamed("League Standings")).not.toBeNull();
    expect(windowNamed("League")).not.toBeNull();
    expect(tab("League Standings").getAttribute("aria-pressed")).toBe("true");
    expect(window.location.search).toBe("?open=home,folder:league,standings");
  });

  it("opens a folder from a deep link", async () => {
    window.history.replaceState(null, "", "/?open=folder:league");
    await renderShell();
    expect(within(windowNamed("League")!).getByRole("button", { name: "Broken" })).toBeTruthy();
  });

  it("drags by the title bar and stays inside the viewport above the taskbar", async () => {
    await renderShell();
    launch("Standings");
    const win = windowNamed("League Standings")!;
    const bar = within(win).getByRole("heading", { name: "League Standings" }).parentElement!;
    const { left, top } = win.style;

    fireEvent.pointerDown(bar, { button: 0, pointerId: 1, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(bar, { pointerId: 1, clientX: 90, clientY: 120 });
    expect(parseFloat(win.style.left)).toBe(parseFloat(left) - 10);
    expect(parseFloat(win.style.top)).toBe(parseFloat(top) + 20);

    fireEvent.pointerMove(bar, { pointerId: 1, clientX: 5000, clientY: 5000 });
    fireEvent.pointerUp(bar, { pointerId: 1 });
    // jsdom's viewport is 1024x768, less the 44px taskbar.
    expect(parseFloat(win.style.left) + parseFloat(win.style.width)).toBe(1024);
    expect(parseFloat(win.style.top) + parseFloat(win.style.height)).toBe(768 - 44);
  });

  it("navigates in place on a drill, with Back and Alt+Left", async () => {
    await renderShell();
    launch("Standings");
    const win = windowNamed("League Standings")!;

    fireEvent.click(within(win).getByRole("button", { name: "Team 6" }));
    expect(win.getAttribute("aria-label")).toBe("Team 6");
    expect(within(win).getByText("team 6")).toBeTruthy();

    fireEvent.click(within(win).getByRole("button", { name: "Back" }));
    expect(win.getAttribute("aria-label")).toBe("League Standings");
    fireEvent.keyDown(document.body, { key: "ArrowRight", altKey: true });
    expect(win.getAttribute("aria-label")).toBe("Team 6");
  });

  it("keeps the desktop up when one window crashes", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    await renderShell();
    fireEvent.doubleClick(icon("Home"));
    launch("Broken");

    expect(within(windowNamed("Broken")!).getByRole("alert").textContent).toMatch(/hit an error/);
    expect(within(windowNamed("CLT Dynasty League")!).getByText("home body")).toBeTruthy();
  });

  it("restores the member's saved layout on the next load", async () => {
    await renderShell();
    fireEvent.doubleClick(icon("Home"));
    cleanup();
    window.history.replaceState(null, "", "/");

    await renderShell();
    expect(windowNamed("CLT Dynasty League")).not.toBeNull();
  });
});

describe("taskbar", () => {
  it("minimizes the focused window and restores it on a second click", async () => {
    await renderShell();
    fireEvent.doubleClick(icon("Home"));
    const home = windowNamed("CLT Dynasty League")!;

    fireEvent.click(tab("CLT Dynasty League"));
    expect(home.hidden).toBe(true);
    fireEvent.click(tab("CLT Dynasty League"));
    expect(home.hidden).toBe(false);
  });

  it("opens Start with the member's name, opens a program from it, and closes", async () => {
    await renderShell();
    const start = screen.getByRole("button", { name: /start/i });
    fireEvent.click(start);
    const menu = startMenu();
    expect(menu.getByText("Roster 4")).toBeTruthy();
    expect(within(menu.getByRole("list", { name: "Pinned" })).getAllByRole("button").map((b) => b.textContent)).toEqual([
      "Home",
      "Standings",
    ]);

    fireEvent.click(menu.getByRole("button", { name: "Standings" }));
    expect(screen.queryByRole("navigation", { name: "Start menu" })).toBeNull();
    expect(start.getAttribute("aria-expanded")).toBe("false");
    expect(tab("League Standings").getAttribute("aria-pressed")).toBe("true");
  });

  it("cascades All Programs into the groups and opens a program from one", async () => {
    await renderShell();
    fireEvent.click(screen.getByRole("button", { name: /start/i }));
    fireEvent.click(startMenu().getByRole("button", { name: "All Programs" }));
    const all = within(screen.getByRole("list", { name: "All Programs" }));
    expect(all.getAllByRole("button").map((b) => b.textContent)).toEqual(["Home", "League"]);

    fireEvent.click(all.getByRole("button", { name: "League" }));
    const league = within(screen.getByRole("list", { name: "League" }));
    fireEvent.click(league.getByRole("button", { name: "Broken" }));
    expect(screen.queryByRole("navigation", { name: "Start menu" })).toBeNull();
    expect(windowNamed("Broken")).not.toBeNull();

    // A program opened from anywhere is offered again under Recent.
    fireEvent.click(screen.getByRole("button", { name: /start/i }));
    expect(within(startMenu().getByRole("list", { name: "Recent" })).getByRole("button").textContent).toBe("Broken");
  });

  it("walks the cascades with the arrow keys", async () => {
    await renderShell();
    const start = screen.getByRole("button", { name: /start/i });
    fireEvent.click(start, { detail: 0 });
    expect(document.activeElement?.textContent).toBe("Home");

    const programs = startMenu().getByRole("button", { name: "All Programs" });
    act(() => programs.focus());
    fireEvent.keyDown(programs, { key: "ArrowRight" });
    expect(document.activeElement?.textContent).toBe("Home");
    fireEvent.keyDown(document.activeElement!, { key: "ArrowDown" });
    const league = document.activeElement as HTMLElement;
    expect(league.textContent).toBe("League");
    fireEvent.keyDown(league, { key: "ArrowRight" });
    expect(document.activeElement?.textContent).toBe("Standings");

    fireEvent.keyDown(document.activeElement!, { key: "ArrowLeft" });
    expect(document.activeElement).toBe(league);
    expect(screen.queryByRole("list", { name: "League" })).toBeNull();
    fireEvent.keyDown(league, { key: "Escape" });
    expect(document.activeElement).toBe(programs);
    expect(screen.queryByRole("list", { name: "All Programs" })).toBeNull();
    expect(screen.getByRole("navigation", { name: "Start menu" })).toBeTruthy();
  });

  it("closes Start on Escape, returning focus, and signs out from it", async () => {
    await renderShell();
    const start = screen.getByRole("button", { name: /start/i });
    fireEvent.click(start);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(document.activeElement).toBe(start);

    fireEvent.click(start);
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Sign out" })));
    expect(signOut).toHaveBeenCalled();
  });

  it("resets the desktop from Start", async () => {
    await renderShell();
    launch("Standings");
    fireEvent.click(screen.getByRole("button", { name: /start/i }));
    fireEvent.click(screen.getByRole("button", { name: "Reset desktop" }));
    expect(windowNamed("League Standings")).toBeNull();
    expect(windowNamed("CLT Dynasty League")).not.toBeNull();
  });
});
