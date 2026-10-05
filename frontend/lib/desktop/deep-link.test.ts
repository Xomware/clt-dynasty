import { describe, expect, it } from "vitest";

import { registerTestWindows } from "@/lib/test/test-windows";
import { openLinks, openParam, parseOpen } from "./deep-link";
import { activeWindow } from "./windows";

registerTestWindows();

describe("parseOpen", () => {
  it("keeps the listed order and reads values through the kind's link reader", () => {
    expect(parseOpen("?open=standings,team:6,home")).toEqual([
      { kind: "standings", params: {} },
      { kind: "team", params: { rosterId: 6 } },
      { kind: "home", params: {} },
    ]);
  });

  it("reads a percent-encoded list", () => {
    expect(parseOpen("?open=home%2Cteam%3A3")).toEqual([
      { kind: "home", params: {} },
      { kind: "team", params: { rosterId: 3 } },
    ]);
  });

  it("ignores unknown kinds, inherited keys and bad values", () => {
    expect(parseOpen("?open=minesweeper,toString,team:0,team:abc,home:5,standings")).toEqual([{ kind: "standings", params: {} }]);
  });
});

describe("openLinks", () => {
  it("opens the links in order with the last on top, and writes the same list back", () => {
    const windows = openLinks([], parseOpen("?open=home,team:6"), 1440, 900);
    expect(activeWindow(windows)?.id).toBe("team:6");
    expect(openParam(windows)).toBe("home,team:6");
  });

  it("brings a saved window back where it was", () => {
    const saved = openLinks([], parseOpen("?open=standings"), 1440, 900).map((w) => ({ ...w, x: 333, minimized: true }));
    const [standings] = openLinks(saved, parseOpen("?open=standings"), 1440, 900);
    expect(standings).toMatchObject({ x: 333, minimized: false });
  });

  it("keeps the base layout when there are no links", () => {
    const base = openLinks([], parseOpen("?open=home"), 1440, 900);
    expect(openLinks(base, [], 1440, 900)).toBe(base);
  });
});
