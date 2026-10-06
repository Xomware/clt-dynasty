import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/clt", () => ({
  getCltMe: vi.fn(async () => ({
    member: { email: "member@example.com", displayName: "Roster 4", role: "member", sleeperUserId: "" },
    linkedSleeperUserId: "",
    isAdmin: false,
  })),
}));

import { DrillContext, NavigateContext } from "@/lib/desktop/navigation";
import { MemberProvider } from "@/lib/member/use-member";
import { FolderWindow } from "./FolderWindow";

const open = vi.fn();
const navigate = vi.fn();

describe("folder window", () => {
  it("lists its group's programs, opens one in a new window, and moves to a sibling folder", async () => {
    render(
      <MemberProvider>
        <DrillContext value={open}>
          <NavigateContext value={navigate}>
            <FolderWindow params={{ id: "draft" }} />
          </NavigateContext>
        </DrillContext>
      </MemberProvider>,
    );
    const icons = within(await screen.findByRole("list", { name: "Draft" }));
    expect(icons.getAllByRole("button").map((b) => b.textContent)).toEqual(["Draft History", "Draft Order", "Taxi Squads"]);
    expect((screen.getByRole("textbox", { name: "Address" }) as HTMLInputElement).value).toBe("C:\\CLT Dynasty\\Draft");

    fireEvent.doubleClick(icons.getByRole("button", { name: "Taxi Squads" }));
    expect(open).toHaveBeenCalledWith({ kind: "taxi", params: {} });

    const places = within(screen.getByRole("navigation", { name: "Other Places" }));
    expect(places.getAllByRole("button").map((b) => b.textContent)).toEqual(["League", "History", "My Stuff", "Community"]);
    fireEvent.click(places.getByRole("button", { name: "History" }));
    expect(navigate).toHaveBeenCalledWith({ kind: "folder", params: { id: "history" } });
  });

  it("says so when a folder has nothing for this member", async () => {
    render(
      <MemberProvider>
        <FolderWindow params={{ id: "admin" }} />
      </MemberProvider>,
    );
    expect(await screen.findByText("This folder is empty.")).toBeTruthy();
    expect(screen.getByText("0 objects")).toBeTruthy();
  });
});
