import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ViewParamsContext } from "@/lib/view-params";
import { BrandLoader } from "./BrandLoader";
import { SpeakerToggle } from "./SpeakerToggle";
import { Tabs } from "./Tabs";
import { Window } from "./Window";

const reduced = (on: boolean) =>
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: on && query.includes("reduced-motion"),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));

afterEach(() => reduced(false));

const TABS = [
  { id: "rules", label: "Rulebook", panel: () => <p>rulebook body</p> },
  { id: "scoring", label: "Scoring", panel: () => <p>scoring body</p> },
  { id: "payouts", label: "Payouts", panel: () => <p>payouts body</p> },
];

describe("Window", () => {
  it("names the region by its title and keeps decorative controls out of the tab order", () => {
    render(
      <Window title="League Settings" controls>
        body
      </Window>,
    );
    const region = screen.getByRole("region", { name: "League Settings" });
    expect(region.querySelector(".xp-titlebar-controls")?.getAttribute("aria-hidden")).toBe("true");
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });
});

describe("Tabs", () => {
  it("moves with the arrow keys and wraps, showing only the selected panel", () => {
    render(<Tabs label="Rules" tabs={TABS} />);
    const first = screen.getByRole("tab", { name: "Rulebook" });
    expect(first.getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("tabpanel").textContent).toBe("rulebook body");

    fireEvent.keyDown(first, { key: "ArrowLeft" });
    const last = screen.getByRole("tab", { name: "Payouts" });
    expect(last.getAttribute("aria-selected")).toBe("true");
    expect(document.activeElement).toBe(last);
    expect(screen.getByRole("tabpanel").textContent).toBe("payouts body");

    fireEvent.keyDown(last, { key: "Home" });
    expect(screen.getByRole("tab", { name: "Rulebook" }).getAttribute("tabindex")).toBe("0");
    expect(last.getAttribute("tabindex")).toBe("-1");
  });

  it("hands a picked tab to the window that holds it", () => {
    const setParams = vi.fn();
    render(
      <ViewParamsContext value={setParams}>
        <Tabs label="Rules" tabs={TABS} selected="scoring" />
      </ViewParamsContext>,
    );
    expect(screen.getByRole("tab", { name: "Scoring" }).getAttribute("aria-selected")).toBe("true");

    fireEvent.click(screen.getByRole("tab", { name: "Payouts" }));
    expect(setParams).toHaveBeenCalledWith({ tab: "payouts" });
  });
});

describe("BrandLoader", () => {
  it("announces its label and hides the art", () => {
    const { container } = render(<BrandLoader label="Signing you in..." />);
    expect(screen.getByRole("status").textContent).toBe("Signing you in...");
    expect(container.querySelector(".brand-loader svg")?.getAttribute("aria-hidden")).toBe("true");
  });

  it("marches the blocks only when motion is allowed", () => {
    const { container, unmount } = render(<BrandLoader label="Loading" />);
    expect(container.querySelector(".brand-loader-run")).not.toBeNull();
    unmount();

    reduced(true);
    const still = render(<BrandLoader label="Loading" />);
    expect(still.container.querySelector(".brand-loader-run")).toBeNull();
    expect(still.container.querySelector(".brand-loader-still")).not.toBeNull();
  });
});

describe("SpeakerToggle", () => {
  it("mutes, remembers it in clt.muted, and unmutes", () => {
    localStorage.clear();
    render(<SpeakerToggle />);
    fireEvent.click(screen.getByRole("button", { name: "Mute sounds" }));
    expect(localStorage.getItem("clt.muted")).toBe("1");

    fireEvent.click(screen.getByRole("button", { name: "Unmute sounds" }));
    expect(localStorage.getItem("clt.muted")).toBe("0");
  });
});
