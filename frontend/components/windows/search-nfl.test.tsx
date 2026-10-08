import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("aws-amplify/auth", () => ({
  fetchAuthSession: vi.fn(async () => ({ tokens: { idToken: { toString: () => "id-token" } } })),
}));

import { Spotlight } from "@/components/buzz/Spotlight";
import { API_BASE } from "@/lib/config";
import { NavigateContext } from "@/lib/desktop/navigation";
import { clearSharedResources } from "@/lib/shared-resource";
import { fixture, stubSleeper } from "@/lib/test/league-mock";
import { ViewParamsContext } from "@/lib/view-params";
import { SearchWindow } from "./SearchWindow";

const PLAYERS = {
  "4984": { player_id: "4984", first_name: "Josh", last_name: "Allen", position: "QB", team: "BUF", search_rank: 3 },
  "5848": { player_id: "5848", first_name: "Keenan", last_name: "Allen", position: "WR", team: "LAC", search_rank: 210 },
  "4892": {
    player_id: "4892",
    first_name: "Justin",
    last_name: "Herbert",
    position: "QB",
    team: "LAC",
    search_rank: 30,
    injury_status: "Questionable",
    injury_body_part: "Knee",
  },
};
// Roster 3 has Herbert.
const ROSTERS = fixture.rosters.map((r) => (r.roster_id === 3 ? { ...r, players: ["4892"] } : r));
const owner = fixture.users.find((u) => u.user_id === ROSTERS.find((r) => r.roster_id === 3)?.owner_id);
const ownerName = owner?.metadata?.team_name || owner?.display_name || "Team 3";

const navigate = vi.fn();
const setParams = vi.fn();
beforeEach(() => {
  stubSleeper({
    [`${API_BASE}/players/list`]: { count: 3, players: PLAYERS },
    [`/league/${fixture.league.league_id}/rosters`]: ROSTERS,
  });
});
afterEach(() => {
  vi.restoreAllMocks();
  clearSharedResources();
  navigate.mockReset();
  setParams.mockReset();
});

describe("Search window, NFL", () => {
  const renderSearch = () =>
    render(
      <NavigateContext value={navigate}>
        <ViewParamsContext value={setParams}>
          <SearchWindow params={{}} />
        </ViewParamsContext>
      </NavigateContext>,
    );

  it("lists players as you type, with team, injury and CLT owner, and opens one", async () => {
    renderSearch();
    fireEvent.change(screen.getByRole("combobox", { name: "Player or NFL team" }), { target: { value: "herb" } });
    const option = await screen.findByRole("option", { name: `Justin Herbert, QB, Los Angeles Chargers, Questionable: Knee, on ${ownerName}` });
    expect(within(option).getByText("LAC")).toBeTruthy();
    expect(within(option).getByText("Q")).toBeTruthy();
    expect(within(option).getByText(ownerName)).toBeTruthy();
    fireEvent.click(option);
    expect(navigate).toHaveBeenCalledWith({ kind: "player", params: { playerId: "4892" } });
    expect(setParams).toHaveBeenCalledWith({ mode: "nfl", q: "herb" });
  });

  it("puts NFL teams first, then players by relevance, and walks them with the arrows", async () => {
    renderSearch();
    const box = screen.getByRole("combobox", { name: "Player or NFL team" });
    fireEvent.change(box, { target: { value: "allen" } });
    await screen.findByRole("option", { name: /^Josh Allen/ });
    expect(screen.getAllByRole("option").map((o) => o.getAttribute("aria-label")?.split(",")[0])).toEqual(["Josh Allen", "Keenan Allen"]);

    fireEvent.change(box, { target: { value: "los angeles" } });
    expect(screen.getAllByRole("option").map((o) => o.getAttribute("aria-label"))).toEqual(["Los Angeles Chargers", "Los Angeles Rams"]);
    fireEvent.keyDown(box, { key: "ArrowDown" });
    expect(box.getAttribute("aria-activedescendant")).toBe(screen.getByRole("option", { name: "Los Angeles Rams" }).id);
    fireEvent.keyDown(box, { key: "Enter" });
    expect(navigate).toHaveBeenCalledWith({ kind: "nfl", params: { team: "LAR" } });
  });

  it("says when nothing matches", async () => {
    renderSearch();
    fireEvent.change(screen.getByRole("combobox", { name: "Player or NFL team" }), { target: { value: "zzzz" } });
    expect(await screen.findByText("No player or NFL team matches “zzzz”.")).toBeTruthy();
  });
});

describe("Spotlight, NFL", () => {
  it("finds NFL players and teams beside the pages, and opens the pick", async () => {
    const onGo = vi.fn();
    render(<Spotlight onClose={() => {}} onGo={onGo} />);
    const box = screen.getByRole("combobox");
    fireEvent.change(box, { target: { value: "herbert" } });
    const players = await screen.findByRole("group", { name: "NFL players" });
    expect(within(players).getAllByRole("option").map((o) => o.getAttribute("aria-label"))).toEqual([
      `Justin Herbert, QB, Los Angeles Chargers, Questionable: Knee, on ${ownerName}`,
    ]);
    fireEvent.keyDown(box, { key: "Enter" });
    expect(onGo).toHaveBeenCalledWith({ kind: "player", params: { playerId: "4892" } });

    fireEvent.change(box, { target: { value: "bolts" } });
    expect(within(screen.getByRole("group", { name: "NFL teams" })).getByRole("option", { name: "Los Angeles Chargers" })).toBeTruthy();
  });
});
