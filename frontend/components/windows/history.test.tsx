import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/clt", () => ({
  getCltMe: vi.fn(async () => ({
    member: { email: "member@example.com", displayName: "Roster 4", role: "member", sleeperUserId: "" },
    linkedSleeperUserId: "u4",
  })),
}));

import { MemberProvider } from "@/lib/member/use-member";
import { stubSleeper } from "@/lib/test/league-mock";
import { HistoryWindow } from "./HistoryWindow";

beforeEach(() => {
  stubSleeper();
});
afterEach(() => {
  vi.restoreAllMocks();
});

const open = (tab?: string) =>
  render(
    <MemberProvider>
      <HistoryWindow params={tab ? { tab } : {}} />
    </MemberProvider>,
  );
const teamNames = (el: HTMLElement) => [...el.querySelectorAll(".xp-team-name")].map((n) => n.textContent);

describe("History", () => {
  it("lists each season's champion and runner-up with the final's score", async () => {
    open();
    const list = await screen.findByRole("list", { name: "Champions by season" });
    const [now, last, first] = within(list).getAllByRole("listitem");
    expect(now.textContent).toMatch(/^2026In progress/);
    expect(teamNames(last)).toEqual(["Team 10", "Team 4"]);
    expect(last.textContent).toMatch(/124\.38.*117\.12/);
    expect(teamNames(first)).toEqual(["Team 2", "Team 11"]);
  });

  it("shows a past season's table with each playoff team's finish", async () => {
    open("seasons");
    fireEvent.change(await screen.findByLabelText("Season"), { target: { value: "1127386764110426112" } });
    const table = screen.getByRole("table", { name: "2024 regular season standings" });
    const rows = within(table).getAllByRole("row").slice(1);
    const finish = Object.fromEntries(rows.map((r) => [teamNames(r)[0], within(r).getAllByRole("cell").at(-1)?.textContent]));
    expect(finish).toMatchObject({ "Team 2": "Champion", "Team 11": "Runner-up", "Team 1": "3rd", "Team 9": "" });
  });

  it("opens head-to-head on the member's team and switches teams", async () => {
    open("rivals");
    await waitFor(() => expect((screen.getByLabelText("Team") as HTMLSelectElement).value).toBe("4"));
    const row = (name: string) =>
      within(screen.getByRole("table"))
        .getAllByRole("row")
        .find((r) => teamNames(r)[0] === name)!;
    expect(within(row("Team 10")).getAllByRole("cell")[1].textContent).toBe("0-3");

    fireEvent.change(screen.getByLabelText("Team"), { target: { value: "10" } });
    expect(within(row("Team 4")).getAllByRole("cell")[1].textContent).toBe("3-0");
  });

  it("says when Sleeper is down", async () => {
    vi.mocked(fetch).mockImplementation(async () => new Response("down", { status: 503 }));
    open();
    expect((await screen.findByRole("alert")).textContent).toMatch(/503/);
  });
});
