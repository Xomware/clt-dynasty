import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("aws-amplify/auth", () => ({
  fetchAuthSession: vi.fn(async () => ({ tokens: { idToken: { toString: () => "id-token" } } })),
}));

import { AlertsProvider } from "@/lib/alerts/alerts";
import type { Proposal } from "@/lib/api/proposals";
import { MemberProvider } from "@/lib/member/use-member";
import { ProposalsWindow } from "./ProposalsWindow";

const me = (isAdmin: boolean) => ({
  member: { email: "member@example.com", displayName: "Roster 4", role: "member", sleeperUserId: "" },
  linkedSleeperUserId: "",
  isAdmin,
});

const proposal = (id: string, patch: Partial<Proposal> = {}): Proposal => ({
  id,
  title: `Proposal ${id}`,
  description: "",
  status: "open",
  proposedBy: "Roster 2",
  isMine: false,
  createdAt: "2026-09-0" + id + "T12:00:00+00:00",
  updatedAt: "2026-09-0" + id + "T12:00:00+00:00",
  yesCount: 1,
  noCount: 0,
  myVote: null,
  voters: { yes: ["Roster 7"], no: [] },
  ...patch,
});

type Reply = [number, unknown];
let routes: Record<string, Reply | (() => Reply)>;

beforeEach(() => {
  routes = {
    "GET /clt/me": [200, me(false)],
    "GET /clt/proposals-list": [
      200,
      {
        proposals: [
          proposal("3", { description: "Move the deadline\nto Week 12." }),
          proposal("2", { isMine: true }),
          proposal("1", { status: "approved", myVote: "yes", yesCount: 2, voters: { yes: ["Roster 7", "Roster 4"], no: [] } }),
        ],
      },
    ],
  };
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const key = `${init?.method ?? "GET"} ${new URL(String(input)).pathname}`;
    const hit = routes[key];
    if (!hit) throw new Error(`unmocked ${key}`);
    const [status, body] = typeof hit === "function" ? hit() : hit;
    return new Response(JSON.stringify(body), { status });
  });
});
afterEach(() => {
  vi.restoreAllMocks();
});

const open = () =>
  render(
    <MemberProvider>
      <AlertsProvider>
        <ProposalsWindow />
      </AlertsProvider>
    </MemberProvider>,
  );
const sent = (path: string) =>
  vi
    .mocked(fetch)
    .mock.calls.filter(([u]) => String(u).endsWith(path))
    .map(([, init]) => JSON.parse(String(init?.body)));
const card = (title: string) => screen.getByRole("article", { name: title });
const confirm = (button: string) => fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: button }));

describe("Proposals", () => {
  it("lists proposals with their votes and voters", async () => {
    open();
    const first = await screen.findByRole("article", { name: "Proposal 3" });
    expect(screen.getAllByRole("article").map((a) => a.querySelector("h3")?.textContent)).toEqual([
      "Proposal 3",
      "Proposal 2",
      "Proposal 1",
    ]);
    expect(within(first).getByText(/Move the deadline/).textContent).toBe("Move the deadline\nto Week 12.");
    expect(within(first).getByText("Roster 7")).toBeTruthy();
    expect(within(card("Proposal 2")).getByText(/Proposed by you/)).toBeTruthy();
    expect(within(card("Proposal 1")).getByText("You voted Yes")).toBeTruthy();
  });

  it("casts a vote after the confirmation and adds the member to the voters", async () => {
    routes["POST /clt/proposals-vote"] = [200, { proposalId: "3", vote: "no" }];
    open();
    fireEvent.click(within(await screen.findByRole("article", { name: "Proposal 3" })).getByRole("button", { name: "Vote No" }));
    confirm("Cancel");
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(sent("/clt/proposals-vote")).toHaveLength(0);

    fireEvent.click(within(card("Proposal 3")).getByRole("button", { name: "Vote No" }));
    confirm("Vote");
    expect(await within(card("Proposal 3")).findByText("You voted No")).toBeTruthy();
    expect(sent("/clt/proposals-vote")).toEqual([{ proposalId: "3", vote: "no" }]);
    expect(within(card("Proposal 3")).getByText("No 1").nextElementSibling?.textContent).toBe("Roster 4");
  });

  it("shows the API's refusal when a vote is no longer allowed", async () => {
    routes["POST /clt/proposals-vote"] = [409, { error: { message: "already voted on this proposal", status: 409 } }];
    open();
    fireEvent.click(within(await screen.findByRole("article", { name: "Proposal 3" })).getByRole("button", { name: "Vote Yes" }));
    confirm("Vote");
    expect((await within(card("Proposal 3")).findByRole("alert")).textContent).toBe("Couldn’t record your vote: already voted on this proposal");
  });

  it("posts a new proposal to the top of the list", async () => {
    routes["POST /clt/proposals-create"] = [201, { proposal: proposal("4", { title: "Add a FLEX", isMine: true, yesCount: 0, voters: { yes: [], no: [] } }) }];
    open();
    fireEvent.click(await screen.findByRole("button", { name: "New proposal" }));
    const post = screen.getByRole("button", { name: "Post proposal" });
    expect(post).toHaveProperty("disabled", true);
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "  Add a FLEX " } });
    fireEvent.click(post);
    expect(await screen.findByRole("article", { name: "Add a FLEX" })).toBeTruthy();
    expect(sent("/clt/proposals-create")).toEqual([{ title: "Add a FLEX", description: "" }]);
    expect(screen.getAllByRole("article")[0].querySelector("h3")?.textContent).toBe("Add a FLEX");
  });

  it("lets the proposer delete their own proposal, but not anyone else's", async () => {
    routes["POST /clt/proposals-delete"] = [200, { deleted: "2" }];
    open();
    await screen.findByRole("article", { name: "Proposal 3" });
    expect(within(card("Proposal 3")).queryByRole("button", { name: "Delete" })).toBeNull();
    expect(screen.queryByLabelText("Status")).toBeNull();

    fireEvent.click(within(card("Proposal 2")).getByRole("button", { name: "Delete" }));
    confirm("Delete");
    await waitFor(() => expect(screen.queryByRole("article", { name: "Proposal 2" })).toBeNull());
    expect(sent("/clt/proposals-delete")).toEqual([{ proposalId: "2" }]);
  });

  it("gives an admin the status picker and re-sorts on a change", async () => {
    routes["GET /clt/me"] = [200, me(true)];
    routes["POST /clt/proposals-status"] = [200, { proposal: proposal("3", { status: "rejected" }) }];
    open();
    await screen.findByRole("article", { name: "Proposal 3" });
    const picker = await within(card("Proposal 3")).findByLabelText("Status");
    expect(within(card("Proposal 3")).getByRole("button", { name: "Delete" })).toBeTruthy();
    fireEvent.change(picker, { target: { value: "rejected" } });

    await waitFor(() => expect(screen.getAllByRole("article")[1].querySelector("h3")?.textContent).toBe("Proposal 3"));
    expect(within(card("Proposal 3")).getByText("Voting is closed.")).toBeTruthy();
    expect(sent("/clt/proposals-status")).toEqual([{ proposalId: "3", status: "rejected" }]);
  });

  it("says so when the admin gate refuses a status change", async () => {
    routes["GET /clt/me"] = [200, me(true)];
    routes["POST /clt/proposals-status"] = [403, { error: { message: "not authorized", status: 403 } }];
    open();
    await screen.findByRole("article", { name: "Proposal 3" });
    fireEvent.change(await within(card("Proposal 3")).findByLabelText("Status"), { target: { value: "approved" } });
    expect((await within(card("Proposal 3")).findByRole("alert")).textContent).toBe("Couldn’t change the status: not authorized");
    expect(within(card("Proposal 3")).getByLabelText("Status")).toHaveProperty("value", "open");
  });

  it("shows an empty list and a failed load", async () => {
    routes["GET /clt/proposals-list"] = [200, { proposals: [] }];
    const { unmount } = open();
    expect(await screen.findByText(/No proposals yet/)).toBeTruthy();
    unmount();

    let fail = true;
    routes["GET /clt/proposals-list"] = () => (fail ? [500, { error: { message: "Internal server error" } }] : [200, { proposals: [] }]);
    open();
    expect((await screen.findByRole("alert")).textContent).toMatch(/Couldn’t load proposals: Internal server error/);
    fail = false;
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText(/No proposals yet/)).toBeTruthy();
  });
});
