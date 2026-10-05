import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { NavigateContext } from "@/lib/desktop/navigation";
import { REGISTRY } from "@/lib/desktop/registry";
import { clearSleeperCache } from "@/lib/sleeper/league";
import { ViewParamsContext } from "@/lib/view-params";
import { SearchWindow } from "./SearchWindow";

let replies: Record<string, [number, unknown]>;
const navigate = vi.fn();
const setParams = vi.fn();

beforeEach(() => {
  replies = {
    "/v1/user/handle6": [200, { user_id: "600", username: "handle6", display_name: "Handle6", avatar: null }],
    "/v1/user/nobody": [200, null],
    "/v1/league/1180000000000000001": [200, { league_id: "1180000000000000001", name: "Other League" }],
    "/v1/league/999": [404, null],
  };
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const hit = replies[new URL(String(input)).pathname];
    if (!hit) throw new TypeError("Failed to fetch");
    return new Response(JSON.stringify(hit[1]), { status: hit[0] });
  });
});
afterEach(() => {
  vi.restoreAllMocks();
  navigate.mockReset();
  setParams.mockReset();
  clearSleeperCache();
});

const renderSearch = (params = {}) =>
  render(
    <NavigateContext value={navigate}>
      <ViewParamsContext value={setParams}>
        <SearchWindow params={params} />
      </ViewParamsContext>
    </NavigateContext>,
  );

const search = (field: string, value: string) => {
  fireEvent.change(screen.getByLabelText(field), { target: { value } });
  fireEvent.click(screen.getByRole("button", { name: "Search" }));
};

describe("Search", () => {
  it("opens a found user's profile and keeps the search for Back", async () => {
    renderSearch();
    search("Sleeper username or user ID", " Handle6 ");
    await vi.waitFor(() => expect(navigate).toHaveBeenCalledWith({ kind: "profile", params: { userId: "600" } }));
    expect(setParams).toHaveBeenCalledWith({ mode: "user", q: "Handle6" });
  });

  it("says when no user has that name", async () => {
    renderSearch();
    search("Sleeper username or user ID", "nobody");
    expect((await screen.findByRole("alert")).textContent).toBe("No Sleeper user named nobody.");
    expect(screen.getByLabelText("Sleeper username or user ID").getAttribute("aria-invalid")).toBe("true");
    expect(navigate).not.toHaveBeenCalled();
  });

  it("opens a league by ID, and rejects one Sleeper doesn't have or that isn't a number", async () => {
    renderSearch();
    fireEvent.click(screen.getByLabelText("Sleeper league"));
    search("Sleeper league ID", "abc");
    expect((await screen.findByRole("alert")).textContent).toBe("A league ID is all digits.");
    search("Sleeper league ID", "999");
    expect((await screen.findByText("No Sleeper league with ID 999.")).getAttribute("role")).toBe("alert");
    search("Sleeper league ID", "1180000000000000001");
    await vi.waitFor(() =>
      expect(navigate).toHaveBeenCalledWith({ kind: "league", params: { leagueId: "1180000000000000001" } }),
    );
  });

  it("tells a network failure apart from a miss", async () => {
    renderSearch();
    search("Sleeper username or user ID", "offline");
    expect((await screen.findByRole("alert")).textContent).toBe("Couldn’t reach Sleeper: Failed to fetch");
  });

  it("reads its link back into a filled-in search", () => {
    expect(REGISTRY.search.link?.("user:handle6")).toEqual({ mode: "user", q: "handle6" });
    expect(REGISTRY.search.link?.("player:x")).toBeNull();
  });

  it("comes back filled in from its params", () => {
    renderSearch({ mode: "league", q: "1180000000000000001" });
    expect((screen.getByLabelText("Sleeper league ID") as HTMLInputElement).value).toBe("1180000000000000001");
    expect((screen.getByLabelText("Sleeper league") as HTMLInputElement).checked).toBe(true);
  });
});
