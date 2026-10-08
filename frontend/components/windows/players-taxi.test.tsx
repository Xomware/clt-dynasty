import { render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("aws-amplify/auth", () => ({
  fetchAuthSession: vi.fn(async () => ({ tokens: { idToken: { toString: () => "id-token" } } })),
}));

import { MemberProvider } from "@/lib/member/use-member";
import { stubTaxi } from "@/lib/test/taxi-fixture";
import { ViewParamsContext } from "@/lib/view-params";
import { PlayersWindow } from "./PlayersWindow";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Players page: taxi squads", () => {
  it("filters to taxi players and rates each as a steal at my price, or my own by risk", async () => {
    stubTaxi();
    render(
      <MemberProvider>
        <ViewParamsContext value={vi.fn()}>
          <PlayersWindow params={{ v: "slot-taxi~sort-value" }} />
        </ViewParamsContext>
      </MemberProvider>,
    );
    expect(screen.getByRole("combobox", { name: "Roster spot" })).toHaveProperty("value", "taxi");
    const t = await screen.findByRole("table", { name: /^Players, sorted by/ });
    const badge = async (name: string) => ((await within(t).findByText(name)).closest("tr") as HTMLElement).querySelector(".pl-col-worth")?.textContent;
    expect(await badge("Jeremiyah Love")).toBe("Steal: bargain2027 1st + 2027 2nd, 1.3x the picks");
    expect(await badge("Carnell Tate")).toBe("Steal requestedBy Roster 2");
    expect(await badge("Mike Washington")).toBe("Steal requestedworth 1.1x a 2nd");
    expect(await badge("Fernando Mendoza")).toBe("Watchworth 0.8x a 1st and a 2nd");
  });
});
