import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("aws-amplify/auth", () => ({
  fetchAuthSession: vi.fn(async () => ({ tokens: { idToken: { toString: () => "id-token" } } })),
}));

import { AlertsProvider } from "@/lib/alerts/alerts";
import type { TaxiRequest } from "@/lib/api/taxi";
import { API_BASE } from "@/lib/config";
import { MemberProvider } from "@/lib/member/use-member";
import { fixture, stubSleeper } from "@/lib/test/league-mock";
import { TaxiWindow } from "./TaxiWindow";

const ME = {
  member: { email: "member@example.com", displayName: "Roster 4", role: "member", sleeperUserId: "" },
  linkedSleeperUserId: "u4",
  isAdmin: false,
};

// Love went 1.01 and Tate 1.02 in the 2026 fixture draft; "99999" was never drafted.
const TAXI: Record<number, string[]> = { 6: ["13287", "99999"], 9: ["13279"], 4: ["13269"] };
const rosters = fixture.rosters.map((r) => ({ ...r, taxi: TAXI[r.roster_id] ?? null }));

const request = (playerId: string, patch: Partial<TaxiRequest> = {}): TaxiRequest => ({
  playerId,
  rosterId: 9,
  requestedBy: "Roster 2",
  isMine: false,
  createdAt: "2026-09-20T12:00:00+00:00",
  ...patch,
});

const json = (status: number, body: unknown) => () => new Response(JSON.stringify(body), { status });

const open = (extra: Record<string, unknown> = {}) => {
  stubSleeper({
    [`/league/${fixture.league.league_id}/rosters`]: rosters,
    [`${API_BASE}/clt/me`]: ME,
    [`${API_BASE}/clt/taxi-list`]: { leagueId: fixture.league.league_id, requests: [request("13279")] },
    ...extra,
  });
  return render(
    <MemberProvider>
      <AlertsProvider>
        <TaxiWindow />
      </AlertsProvider>
    </MemberProvider>,
  );
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Taxi Squads", () => {
  it("lists each team's taxi players with their draft slot, the member's team first", async () => {
    open();
    const six = await screen.findByRole("region", { name: "Team 6" });
    expect(screen.getAllByRole("region").map((r) => r.getAttribute("aria-label"))).toEqual(["Team 4", "Team 6", "Team 9"]);
    expect(await within(six).findByText("Drafted 2026 1.01")).toBeTruthy();
    expect(within(six).getByText("Not drafted in this league")).toBeTruthy();
    expect(within(six).getAllByRole("button", { name: /^Steal / })).toHaveLength(2);
  });

  it("offers no steal on the member's own squad and shows existing requests", async () => {
    open();
    const mine = await screen.findByRole("region", { name: "Team 4" });
    expect(within(mine).queryByRole("button", { name: /^Steal / })).toBeNull();
    const nine = screen.getByRole("region", { name: "Team 9" });
    expect(within(nine).getByText(/Steal requested by Roster 2/)).toBeTruthy();
    expect(within(nine).queryByRole("button", { name: /^Steal / })).toBeNull();
  });

  it("requests a steal after the confirmation", async () => {
    const posted = vi.fn(json(201, { request: request("13287", { rosterId: 6, requestedBy: "Roster 4", isMine: true }) }));
    open({ [`${API_BASE}/clt/taxi-request`]: posted });
    const six = await screen.findByRole("region", { name: "Team 6" });
    fireEvent.click(within(six).getAllByRole("button", { name: /^Steal / })[0]);
    fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Request" }));

    expect(await within(six).findByText(/Steal requested by you/)).toBeTruthy();
    const call = vi.mocked(fetch).mock.calls.find(([u]) => String(u).endsWith("/clt/taxi-request"));
    expect(JSON.parse(String(call?.[1]?.body))).toEqual({ playerId: "13287" });
  });

  it("shows the API's reason when the request is refused", async () => {
    open({ [`${API_BASE}/clt/taxi-request`]: json(409, { error: { message: "this player already has a steal request" } }) });
    const six = await screen.findByRole("region", { name: "Team 6" });
    fireEvent.click(within(six).getAllByRole("button", { name: /^Steal / })[0]);
    fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Request" }));
    expect((await within(six).findByRole("alert")).textContent).toBe("Couldn’t request the steal: this player already has a steal request");
  });

  it("says so when no team has a taxi player", async () => {
    open({ [`/league/${fixture.league.league_id}/rosters`]: fixture.rosters });
    expect(await screen.findByText(/No team has a player on its taxi squad/)).toBeTruthy();
  });

  it("shows a failed request list and retries it", async () => {
    let fail = true;
    open({
      [`${API_BASE}/clt/taxi-list`]: () =>
        fail ? json(500, { error: { message: "Internal server error" } })() : json(200, { leagueId: "x", requests: [] })(),
    });
    expect((await screen.findByRole("alert")).textContent).toBe("Couldn’t load steal requests: Internal server error");
    fail = false;
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("region", { name: "Team 9" })).toBeTruthy();
  });
});
