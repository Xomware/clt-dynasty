import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("aws-amplify/auth", () => ({
  fetchAuthSession: vi.fn(async () => ({ tokens: { idToken: { toString: () => "id-token" } } })),
}));

import { AlertsProvider } from "@/lib/alerts/alerts";
import { API_BASE } from "@/lib/config";
import { MemberProvider } from "@/lib/member/use-member";
import { fixture } from "@/lib/test/league-mock";
import { json, request, stubTaxi } from "@/lib/test/taxi-fixture";
import { ViewParamsContext } from "@/lib/view-params";
import { TaxiWindow } from "./TaxiWindow";

const open = (tab: string, extra: Record<string, unknown> = {}) => {
  stubTaxi(extra);
  return render(
    <MemberProvider>
      <AlertsProvider>
        <ViewParamsContext.Provider value={null}>
          <TaxiWindow params={{ tab }} />
        </ViewParamsContext.Provider>
      </AlertsProvider>
    </MemberProvider>,
  );
};

const card = (list: HTMLElement, name: string) => within(list).getByText(name).closest("li") as HTMLElement;

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Taxi Squads", () => {
  it("lists every squad with the draft slot and the steal price in my picks, my team first", async () => {
    open("all");
    const six = await screen.findByRole("region", { name: "Team 6" });
    expect(screen.getAllByRole("region").map((r) => r.getAttribute("aria-label"))).toEqual(["Team 4", "Team 6", "Team 9"]);
    const love = card(six, "Jeremiyah Love");
    expect(within(love).getByText(/^Drafted 2026 1\.01/)).toBeTruthy();
    expect(love.querySelector(".tx-price p")?.textContent).toBe("Steal for: 2027 1st (your own) + 2027 2nd (your own)");
    expect(card(six, "Eli Raridon").querySelector(".tx-price p")?.textContent).toBe("Steal for: 2028 3rd (your own)");
    // My own players show the rounds owed, with no steal button.
    const mine = screen.getByRole("region", { name: "Team 4" });
    expect(card(mine, "Fernando Mendoza").querySelector(".tx-price p")?.textContent).toBe("Steal price: a 1st and a 2nd");
    expect(within(mine).queryByRole("button", { name: /^Request steal/ })).toBeNull();
  });

  it("ranks steal targets by surplus over what I'd pay, with the near misses after", async () => {
    open("targets");
    const targets = await screen.findByRole("list", { name: "Steal targets" });
    expect([...targets.querySelectorAll(".pl-name")].map((a) => a.textContent)).toEqual(["Jeremiyah Love", "Eli Raridon"]);
    // 6134 against 3069 + 1601.
    expect(within(card(targets, "Jeremiyah Love")).getByText("Worth 6,134 vs 4,670 in picks (1.3x)")).toBeTruthy();
    const close = screen.getByRole("list", { name: "Close calls" });
    expect(within(close).getByText(/Steal requested by Roster 2/)).toBeTruthy();
  });

  it("flags my requested and close-to-price taxi players with the promote-before-Thursday remedy", async () => {
    open("risk");
    const risks = await screen.findByRole("list", { name: "At risk" });
    const items = within(risks).getAllByRole("listitem");
    expect(items.map((li) => li.querySelector(".pl-name")?.textContent)).toEqual(["Mike Washington", "Fernando Mendoza"]);
    expect(within(items[0]).getByText("Steal requested")).toBeTruthy();
    expect(within(items[0]).getByText(/Steal requested by Roster 7/)).toBeTruthy();
    // 3748 against a 1st and a 2nd, 4670.
    expect(within(items[1]).getByText("Watch").parentElement?.textContent).toBe("Watch worth 0.8x a 1st and a 2nd");
    expect(within(items[1]).getByText(/promote him to your active roster before Thursday 12pm ET/)).toBeTruthy();
  });

  it("confirms exactly what I give up, then requests the steal", async () => {
    const posted = vi.fn(json(201, { request: request("13421", { rosterId: 6, requestedBy: "Roster 4", isMine: true }) }));
    open("targets", { [`${API_BASE}/clt/taxi-request`]: posted });
    const targets = await screen.findByRole("list", { name: "Steal targets" });
    fireEvent.click(within(targets).getByRole("button", { name: "Request steal: Eli Raridon" }));
    const dialog = screen.getByRole("alertdialog");
    expect(dialog.textContent).toContain("You give up 2028 3rd (your own), worth 1,005 on FantasyCalc.");
    fireEvent.click(within(dialog).getByRole("button", { name: "Request steal" }));

    expect(await within(card(targets, "Eli Raridon")).findByText(/Steal requested by you/)).toBeTruthy();
    const call = vi.mocked(fetch).mock.calls.find(([u]) => String(u).endsWith("/clt/taxi-request"));
    expect(JSON.parse(String(call?.[1]?.body))).toEqual({ playerId: "13421" });
  });

  it("shows the API's reason when the request is refused", async () => {
    open("targets", { [`${API_BASE}/clt/taxi-request`]: json(409, { error: { message: "this player already has a steal request" } }) });
    const targets = await screen.findByRole("list", { name: "Steal targets" });
    fireEvent.click(within(targets).getByRole("button", { name: "Request steal: Jeremiyah Love" }));
    fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Request steal" }));
    expect((await within(targets).findByRole("alert")).textContent).toBe("Couldn’t request the steal: this player already has a steal request");
  });

  it("says so when no team has a taxi player", async () => {
    open("all", { [`/league/${fixture.league.league_id}/rosters`]: fixture.rosters });
    expect(await screen.findByText(/No team has a player on its taxi squad/)).toBeTruthy();
  });

  it("shows a failed request list and retries it", async () => {
    let fail = true;
    open("all", {
      [`${API_BASE}/clt/taxi-list`]: () =>
        fail ? json(500, { error: { message: "Internal server error" } })() : json(200, { leagueId: "x", requests: [] })(),
    });
    expect((await screen.findByRole("alert")).textContent).toBe("Couldn’t load taxi squads: Internal server error");
    fail = false;
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("region", { name: "Team 9" })).toBeTruthy();
  });
});
