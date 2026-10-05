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
  it("lists every launcher on the desktop but keeps drill-only windows off it", async () => {
    await renderShell();
    const names = within(screen.getByRole("list", { name: "Desktop" }))
      .getAllByRole("button")
      .map((b) => b.textContent);
    expect(names).toEqual(["Settings", "My Team", "Profile", "Home", "Standings", "Broken"]);
  });

  it("opens a window on double-click and mirrors it into the URL", async () => {
    await renderShell();
    fireEvent.doubleClick(icon("Standings"));

    expect(windowNamed("League Standings")).not.toBeNull();
    expect(tab("League Standings").getAttribute("aria-pressed")).toBe("true");
    expect(window.location.search).toBe("?open=standings");
  });

  it("drags by the title bar and stays inside the viewport above the taskbar", async () => {
    await renderShell();
    fireEvent.doubleClick(icon("Standings"));
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
    fireEvent.doubleClick(icon("Standings"));
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
    fireEvent.doubleClick(icon("Broken"));

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
    const menu = within(screen.getByRole("navigation", { name: "Start menu" }));
    expect(menu.getByText("Roster 4")).toBeTruthy();

    fireEvent.click(menu.getByRole("button", { name: "Standings" }));
    expect(screen.queryByRole("navigation", { name: "Start menu" })).toBeNull();
    expect(start.getAttribute("aria-expanded")).toBe("false");
    expect(tab("League Standings").getAttribute("aria-pressed")).toBe("true");
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
    fireEvent.doubleClick(icon("Home"));
    fireEvent.click(screen.getByRole("button", { name: /start/i }));
    fireEvent.click(screen.getByRole("button", { name: "Reset desktop" }));
    expect(windowNamed("CLT Dynasty League")).toBeNull();
  });
});
