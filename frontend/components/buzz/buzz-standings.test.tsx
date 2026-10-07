import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("aws-amplify/auth", () => ({
  fetchAuthSession: vi.fn(async () => ({ tokens: { idToken: { toString: () => "id-token" } } })),
}));
vi.mock("@/lib/api/clt", () => ({
  getCltMe: vi.fn(async () => ({
    member: { email: "member@example.com", displayName: "Roster 4", role: "member", sleeperUserId: "u12" },
    linkedSleeperUserId: "u4",
  })),
}));

import { clearLeagueCache } from "@/lib/league/cache";
import { MemberProvider } from "@/lib/member/use-member";
import { stubSleeper } from "@/lib/test/league-mock";
import { BuzzStandings } from "./BuzzStandings";

beforeEach(() => {
  stubSleeper();
});
afterEach(() => {
  vi.restoreAllMocks();
  clearLeagueCache();
});

const cells = (row: HTMLElement) =>
  within(row)
    .getAllByRole("cell")
    .map((c) => (c.querySelector(".xp-team-name") ?? c.querySelector(".sr-only") ?? c).textContent);

describe("Buzz City standings", () => {
  it("boards the league by record with streaks, points and seeds", async () => {
    render(
      <MemberProvider>
        <BuzzStandings params={{}} />
      </MemberProvider>,
    );
    const table = await screen.findByRole("table", { name: "League standings" });
    const rows = within(table).getAllByRole("row").slice(1);
    expect(rows.map((r) => cells(r)[1])).toEqual([2, 4, 12, 5, 7, 11, 3, 8, 10, 9, 6, 1].map((id) => `Team ${id}`));
    expect(cells(rows[0])).toEqual(["01", "Team 2", "3-0", "W3", "524.0", "410.3", "1"]);
    expect(cells(rows[2]).at(-1)).toBe("4");
    await waitFor(() => expect(within(table).getByRole("img", { name: "Your team" }).closest("tr")?.hasAttribute("data-me")).toBe(true));
  });

  it("switches to the divisions without a page of its own", async () => {
    render(
      <MemberProvider>
        <BuzzStandings params={{}} />
      </MemberProvider>,
    );
    fireEvent.click(await screen.findByRole("button", { name: "Divisions" }));
    expect(screen.getByRole("button", { name: "Divisions" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getAllByRole("table").map((t) => t.querySelector("caption")?.textContent)).toEqual([
      "BIG10 standings",
      "SEC standings",
      "ACC standings",
    ]);
  });

  it("says when Sleeper is down", async () => {
    vi.mocked(fetch).mockImplementation(async () => new Response("down", { status: 503 }));
    render(
      <MemberProvider>
        <BuzzStandings params={{}} />
      </MemberProvider>,
    );
    expect((await screen.findByRole("alert")).textContent).toMatch(/Couldn.t reach Sleeper .*503/);
  });
});
