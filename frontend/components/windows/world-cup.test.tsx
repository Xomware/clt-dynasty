import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("aws-amplify/auth", () => ({
  fetchAuthSession: vi.fn(async () => ({ tokens: { idToken: { toString: () => "id-token" } } })),
}));

import type { WorldCup, WorldCupTeam } from "@/lib/api/clt";
import { API_BASE } from "@/lib/config";
import { MemberProvider } from "@/lib/member/use-member";
import { stubSleeper } from "@/lib/test/league-mock";
import { WorldCupWindow } from "./WorldCupWindow";

const ME = {
  member: { email: "member@example.com", displayName: "Roster 4", role: "member", sleeperUserId: "" },
  linkedSleeperUserId: "u4",
  isAdmin: false,
};

const team = (id: number, wins: number, status: WorldCupTeam["status"]): WorldCupTeam => ({
  userId: `u${id}`,
  username: `user${id}`,
  teamName: `Team ${id}`,
  wins,
  losses: 12 - wins,
  ties: 0,
  pointsFor: 1000 + wins * 10.5,
  pointsAgainst: 1100,
  status,
});

const CUP: WorldCup = {
  leagueId: "1317249551823814656",
  season: "2026",
  divisions: [
    { division: 1, name: "BIG10", gamesRemaining: 3, teams: [team(4, 9, "clinched"), team(1, 7, "alive"), team(7, 5, "alive"), team(8, 2, "eliminated")] },
    { division: 2, name: "SEC", gamesRemaining: 0, teams: [team(5, 8, "clinched"), team(9, 6, "clinched")] },
  ],
};

const json = (status: number, body: unknown) => () => new Response(JSON.stringify(body), { status });

const open = (cup: unknown) => {
  stubSleeper({ [`${API_BASE}/clt/me`]: ME, [`${API_BASE}/clt/world-cup`]: cup });
  return render(
    <MemberProvider>
      <WorldCupWindow />
    </MemberProvider>,
  );
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("World Cup", () => {
  it("lists each division in the order the API ranks it, top two qualifying", async () => {
    open(CUP);
    const big10 = await screen.findByRole("table", { name: "BIG10 World Cup standings" });
    const rows = within(big10).getAllByRole("row").slice(1);
    expect(rows.map((r) => r.querySelector(".xp-team-name")?.textContent)).toEqual(["Team 4", "Team 1", "Team 7", "Team 8"]);
    expect(rows.map((r) => r.className)).toEqual(["xp-in", "xp-in", "", ""]);
    expect(rows.map((r) => r.querySelector("td:last-child")?.textContent)).toEqual(["Clinched", "Alive", "Alive", "Out"]);
    expect(screen.getByText("3 divisional games left")).toBeTruthy();
    expect(screen.getByText("Divisional games done")).toBeTruthy();
  });

  it("stars the member's own team", async () => {
    open(CUP);
    const big10 = await screen.findByRole("table", { name: "BIG10 World Cup standings" });
    const star = within(big10).getByRole("img", { name: "Your team" });
    expect(star.closest("tr")?.querySelector(".xp-team-name")?.textContent).toBe("Team 4");
  });

  it("says so before any divisional game", async () => {
    open({ ...CUP, divisions: [] });
    expect(await screen.findByText("No divisional games have been played yet.")).toBeTruthy();
  });

  it("shows the API's reason and retries", async () => {
    let fail = true;
    stubSleeper({
      [`${API_BASE}/clt/me`]: ME,
      [`${API_BASE}/clt/world-cup`]: () => (fail ? json(502, { error: { message: "Sleeper is down" } })() : json(200, CUP)()),
    });
    render(
      <MemberProvider>
        <WorldCupWindow />
      </MemberProvider>,
    );
    expect((await screen.findByRole("alert")).textContent).toBe("Couldn’t load World Cup standings: Sleeper is down");
    fail = false;
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("table", { name: "SEC World Cup standings" })).toBeTruthy();
  });
});
