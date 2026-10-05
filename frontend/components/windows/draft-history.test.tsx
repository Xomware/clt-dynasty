import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/clt", () => ({
  getCltMe: vi.fn(async () => ({
    member: { email: "member@example.com", displayName: "Roster 4", role: "member", sleeperUserId: "" },
    linkedSleeperUserId: "u4",
  })),
}));

import { MemberProvider } from "@/lib/member/use-member";
import { draftFixture, fixture, stubSleeper } from "@/lib/test/league-mock";
import { DraftHistoryWindow } from "./DraftHistoryWindow";

const id = fixture.league.league_id;
const current = draftFixture[id].drafts[0];

beforeEach(() => {
  stubSleeper();
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const open = (tab?: string) =>
  render(
    <MemberProvider>
      <DraftHistoryWindow params={tab ? { tab } : {}} />
    </MemberProvider>,
  );

describe("Draft History: Live", () => {
  it("shows this season's draft by round", async () => {
    open();
    const round1 = await screen.findByRole("region", { name: "Round 1" });
    expect(screen.getByText("Complete")).toBeTruthy();
    expect(within(round1).getAllByRole("listitem")[0].textContent).toMatch(/^1\.01Jeremiyah Love RB ARITeam 6/);
    expect(screen.getAllByRole("region", { name: /^Round / })).toHaveLength(5);
  });

  it("filters to the member's picks", async () => {
    open();
    await screen.findByRole("region", { name: "Round 1" });
    fireEvent.click(screen.getByRole("button", { name: "My picks" }));
    const mine = current.picks.filter((p) => p.roster_id === 4);
    const rows = screen.getAllByRole("img", { name: "Your pick" });
    expect(rows).toHaveLength(mine.length);
  });

  it("lays the draft out as a board", async () => {
    open();
    await screen.findByRole("region", { name: "Round 1" });
    fireEvent.click(screen.getByRole("button", { name: "Board" }));
    const board = screen.getByRole("table", { name: /draft board/ });
    expect(within(board).getAllByRole("row")).toHaveLength(6);
    expect(within(board).getAllByRole("row")[1].querySelectorAll("td")[0].textContent).toBe("LoveRB");
  });

  it("counts down to a scheduled draft and lists who holds each pick", async () => {
    const start = Date.now() + (2 * 86400 + 3 * 3600 + 5 * 60) * 1000 + 500;
    stubSleeper({
      [`/league/${id}/drafts`]: [{ ...current.draft, status: "pre_draft", start_time: start }],
      [`/draft/${current.draft.draft_id}/picks`]: [],
    });
    open();
    expect(await screen.findByText("Starts in 2d 3h 5m")).toBeTruthy();
    const first = within(screen.getByRole("region", { name: "Round 1" })).getAllByRole("listitem")[0];
    expect(first.textContent).toMatch(/On the board.*Team 6/);
  });

  it("says when the league has no draft", async () => {
    stubSleeper({ [`/league/${id}/drafts`]: [] });
    open();
    expect(await screen.findByText(/has no draft for the 2026 league/)).toBeTruthy();
  });

  it("says when Sleeper is down", async () => {
    stubSleeper({ [`/league/${id}/drafts`]: () => new Response("down", { status: 503 }) });
    open();
    expect((await screen.findByRole("alert")).textContent).toMatch(/503/);
  });
});

describe("Draft History: Picks", () => {
  it("shows each finished draft's picks with who made them", async () => {
    open("picks");
    const select = await screen.findByLabelText("Draft");
    expect([...(select as HTMLSelectElement).options].map((o) => o.textContent)).toEqual(["2026", "2025", "2024"]);
    fireEvent.change(select, { target: { value: draftFixture["1181789700187090944"].drafts[0].draft.draft_id } });
    const round1 = screen.getByRole("region", { name: "Round 1" });
    const first = draftFixture["1181789700187090944"].drafts[0].picks[0];
    expect(within(round1).getAllByRole("listitem")[0].textContent).toContain(`Team ${first.roster_id}`);
  });

  it("says when a draft has no recorded picks", async () => {
    open("picks");
    fireEvent.change(await screen.findByLabelText("Draft"), { target: { value: draftFixture["1127386764110426112"].drafts[0].draft.draft_id } });
    expect(screen.getByText("No picks were recorded for the 2024 draft.")).toBeTruthy();
  });
});
