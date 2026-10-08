import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { useAfterIntro } from "@/components/motion/use-scroll-in";
import type { Team } from "@/lib/league/use-league";
import { BoardSeeds } from "./BoardSeeds";
import { ChampionCards } from "./ChampionCards";

const team = (name: string): Team => ({ name, avatarUrl: null });

describe("ChampionCards", () => {
  it("names each card and flips it over on a tap", () => {
    render(
      <ChampionCards
        champions={[
          { season: "2025", champion: team("Gangsters"), runnerUp: team("Griffins") },
          { season: "2024", champion: team("Tibor"), runnerUp: null },
        ]}
      />,
    );
    const card = screen.getByRole("button", { name: /2025 champion: Gangsters, beat Griffins in the final/ });
    expect(card.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(card);
    expect(card.getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: /2024 champion: Tibor\. Flip/ })).toBeTruthy();
  });

  it("says when no season has finished", () => {
    render(<ChampionCards champions={[]} />);
    expect(screen.getByText(/first banner is still up for grabs/)).toBeTruthy();
  });
});

describe("BoardSeeds", () => {
  it("reads the seeds as a table, the flip tiles as plain text", () => {
    const seeds = [{ seed: 1, team: team("Gangsters"), record: "4-0", pf: 572.2, division: "BIG10" }];
    render(<BoardSeeds overview={{ season: "2026", phase: "", live: true, seeds, champions: [], draft: null }} />);
    const row = screen.getAllByRole("row")[1];
    expect(row.textContent).toContain("Gangsters");
    expect(screen.getByText("4-0", { selector: ".sr-only" })).toBeTruthy();
    expect(screen.getByText("572.2", { selector: ".sr-only" })).toBeTruthy();
  });
});

function Gate() {
  return <p>{useAfterIntro() ? "go" : "wait"}</p>;
}

describe("useAfterIntro", () => {
  afterEach(() => document.querySelector(".bzi")?.remove());

  it("waits while an intro is on screen and goes once it leaves", async () => {
    const intro = Object.assign(document.createElement("div"), { className: "bzi" });
    // jsdom lays nothing out; an intro on screen is one with a box.
    intro.getClientRects = () => [new DOMRect(0, 0, 10, 10)] as unknown as DOMRectList;
    document.body.append(intro);
    render(<Gate />);
    expect(screen.getByText("wait")).toBeTruthy();

    await act(async () => intro.remove());
    expect(screen.getByText("go")).toBeTruthy();
  });

  it("goes as soon as the intro starts to leave", async () => {
    const intro = Object.assign(document.createElement("div"), { className: "bzi" });
    intro.getClientRects = () => [new DOMRect(0, 0, 10, 10)] as unknown as DOMRectList;
    intro.setAttribute("data-phase", "play");
    document.body.append(intro);
    render(<Gate />);
    expect(screen.getByText("wait")).toBeTruthy();

    await act(async () => intro.setAttribute("data-phase", "leave"));
    expect(screen.getByText("go")).toBeTruthy();
  });
});
