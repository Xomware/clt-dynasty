import { render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { stubSleeper } from "@/lib/test/league-mock";
import { RulesWindow } from "./RulesWindow";

beforeEach(() => {
  stubSleeper();
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("Rules", () => {
  it("lists the rulebook chapters, each opening to its text", () => {
    render(<RulesWindow params={{}} />);
    const chapters = screen.getAllByText(/^\d\. /, { selector: "summary" });
    expect(chapters.map((c) => c.textContent)).toEqual([
      "1. League Setup",
      "2. Schedule & Season Format",
      "3. Roster Rules, Trading & Add/Drops",
      "4. Scoring",
      "5. Draft Information",
      "6. Dues & Payouts",
      "7. Rule Changes",
    ]);
    expect(chapters[1].closest("details")?.textContent).toContain("No consolation games or 3rd place match.");
  });

  it("reads scoring from Sleeper", async () => {
    render(<RulesWindow params={{ tab: "scoring" }} />);
    const passing = await screen.findByRole("region", { name: "Passing" });
    expect(within(passing).getByText("Pass yards").nextSibling?.textContent).toBe("+0.04 (1 per 25 yds)");
  });

  it("shows roster slots and league settings with division names", async () => {
    render(<RulesWindow params={{ tab: "settings" }} />);
    const slots = await screen.findByRole("region", { name: "Roster slots" });
    expect(within(slots).getByText("Bench").nextSibling?.textContent).toBe("17");
    const league = screen.getByRole("region", { name: "League settings" });
    expect(within(league).getByText("Divisions").nextSibling?.textContent).toBe("BIG10, SEC, ACC");
    expect(within(league).getByText("Format").nextSibling?.textContent).toBe("Dynasty");
  });

  it("shows the payouts without Sleeper", () => {
    vi.mocked(fetch).mockImplementation(async () => new Response("down", { status: 503 }));
    render(<RulesWindow params={{ tab: "payouts" }} />);
    expect(screen.getByRole("cell", { name: "$600" })).toBeTruthy();
  });

  it("says when Sleeper is down for its settings", async () => {
    vi.mocked(fetch).mockImplementation(async () => new Response("down", { status: 503 }));
    render(<RulesWindow params={{ tab: "scoring" }} />);
    expect((await screen.findByRole("alert")).textContent).toMatch(/503/);
  });
});
