import { describe, expect, it } from "vitest";

import { REGISTRY } from "@/lib/desktop/registry";
import { ABOUT, groupOf } from "./pages";

describe("Buzz City pages", () => {
  it("has a one-liner for every window a member can launch", () => {
    const launchable = Object.entries(REGISTRY).filter(([, s]) => !s.drillOnly).map(([k]) => k);
    expect(launchable.filter((k) => !(k in ABOUT))).toEqual([]);
  });

  it("files a drill-only page under the group it was opened from", () => {
    expect(groupOf({ kind: "standings", params: {} }, null)).toBe("league");
    expect(groupOf({ kind: "team", params: { rosterId: 3 } }, "league")).toBe("league");
    expect(groupOf({ kind: "folder", params: { id: "draft" } }, "league")).toBe("draft");
    expect(groupOf({ kind: "home", params: {} }, "league")).toBeNull();
  });
});
