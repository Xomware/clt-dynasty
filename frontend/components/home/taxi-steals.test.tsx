import { render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("aws-amplify/auth", () => ({
  fetchAuthSession: vi.fn(async () => ({ tokens: { idToken: { toString: () => "id-token" } } })),
}));

import { MemberProvider } from "@/lib/member/use-member";
import { stubTaxi } from "@/lib/test/taxi-fixture";
import { TaxiSteals } from "./TaxiSteals";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Your week: taxi steals", () => {
  it("lists my at-risk taxi players and the steals worth making, with links to the market", async () => {
    stubTaxi();
    render(
      <MemberProvider>
        <TaxiSteals rosterId={4} />
      </MemberProvider>,
    );
    const risks = await screen.findByRole("list", { name: "At risk on your taxi" });
    expect(within(risks).getAllByRole("listitem").map((li) => li.textContent)).toEqual([
      "RBSteal requested: Mike Washington worth 1.1x a 2nd. Promote him before Thursday 12pm ET to keep him.",
      "QBWatch: Fernando Mendoza worth 0.8x a 1st and a 2nd. Promote him before Thursday 12pm ET to keep him.",
    ]);
    const targets = screen.getByRole("list", { name: "Steal targets" });
    expect(within(targets).getAllByRole("listitem")[0].textContent).toBe("RBJeremiyah Love from Team 6 for 2027 1st + 2027 2nd, worth 1.3x the picks");
    expect(screen.getByText("All steal targets")).toBeTruthy();
  });

  it("waits for the member's team before saying nobody is at risk", () => {
    stubTaxi();
    render(
      <MemberProvider>
        <TaxiSteals rosterId={null} />
      </MemberProvider>,
    );
    expect(screen.getByRole("status").textContent).toBe("Pricing taxi squads...");
  });
});
