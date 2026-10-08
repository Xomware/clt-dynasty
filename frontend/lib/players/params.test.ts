import { describe, expect, it } from "vitest";

import { parseOpen } from "@/lib/desktop/deep-link";
import { windowId } from "@/lib/desktop/windows";
import { decode, DEFAULT_VIEW, encode, readPlayersLink, readView, writeView } from "./params";

describe("players view params", () => {
  it("writes only what differs from the default, and reads it back", () => {
    expect(encode(writeView(DEFAULT_VIEW))).toBe("");
    const view = { ...DEFAULT_VIEW, q: "amon-ra st brown", pos: ["WR", "TE"], owner: "available" as const, rookies: true, ageMax: 25, sort: "age" as const, desc: false };
    const v = encode(writeView(view));
    expect(v).toBe("q-amon-ra st brown~pos-WR.TE~own-available~rk-1~amax-25~sort-age");
    expect(readView(decode(v))).toEqual(view);
  });

  it("keeps a CLT team by roster id and drops what it can't read", () => {
    expect(readView(decode("own-7~pos-QB.DEF~sort-nope~nfl-buf~amin-3")).owner).toBe(7);
    const junk = readView(decode("own-99x~pos-QB.DEF~sort-nope~nfl-buf~amin-3"));
    expect(junk).toEqual({ ...DEFAULT_VIEW, pos: ["QB"] });
  });

  it("leaves the scenario's fields alone when the filters change", () => {
    const fields = decode("add-123.456~pos-RB");
    expect(encode(writeView({ ...DEFAULT_VIEW, pos: ["QB"] }, fields))).toBe("add-123.456~pos-QB");
  });

  it("strips the characters a window link reserves from the search", () => {
    const v = encode(writeView({ ...DEFAULT_VIEW, q: readView(decode("q-ja'marr, chase:~x")).q }));
    expect(v).not.toMatch(/[,:]/);
    expect(readView(decode("q-Ja'Marr")).q).toBe("jamarr");
  });

  it("round-trips through a window link, with or without a tab", () => {
    const v = "pos-RB~own-available";
    const links: Record<string, string>[] = [{ v }, { tab: "sim", v }, { tab: "compare" }, {}];
    for (const params of links) {
      expect(parseOpen(`?open=${windowId("players", params)}`)).toEqual([{ kind: "players", params }]);
    }
    expect(readPlayersLink("bogus:pos-QB")).toEqual({ v: "pos-QB" });
  });
});
