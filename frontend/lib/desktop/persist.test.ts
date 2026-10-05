import { afterEach, describe, expect, it, vi } from "vitest";

import { registerTestWindows } from "@/lib/test/test-windows";
import { loadLayout, saveLayout } from "./persist";
import { desktopReducer, type WindowState } from "./windows";

registerTestWindows();

const realStorage = localStorage;
const layout = (): WindowState[] =>
  desktopReducer(desktopReducer([], { type: "open", kind: "home", params: {}, size: { w: 600, h: 400 } }), {
    type: "open",
    kind: "standings",
    params: {},
    size: { w: 500, h: 500 },
  });

afterEach(() => {
  realStorage.clear();
  vi.stubGlobal("localStorage", realStorage);
});

describe("saved layout", () => {
  it("round-trips per member under clt.desktop.v1", () => {
    saveLayout("a@example.com", layout());

    expect(loadLayout("a@example.com")).toEqual(layout());
    expect(loadLayout("b@example.com")).toBeNull();
    expect(realStorage.getItem("clt.desktop.v1:a@example.com")).not.toBeNull();
  });

  it("returns null for corrupt JSON or a non-array", () => {
    realStorage.setItem("clt.desktop.v1:u", "{not json");
    expect(loadLayout("u")).toBeNull();
    realStorage.setItem("clt.desktop.v1:u", JSON.stringify({ kind: "home" }));
    expect(loadLayout("u")).toBeNull();
  });

  it("drops windows whose kind no longer exists", () => {
    const [home] = layout();
    realStorage.setItem("clt.desktop.v1:u", JSON.stringify([home, { ...home, id: "gone", kind: "gone" }]));
    expect(loadLayout("u")).toEqual([home]);
  });

  it("falls back when storage throws", () => {
    const fail = () => {
      throw new DOMException("denied", "SecurityError");
    };
    vi.stubGlobal("localStorage", { getItem: fail, setItem: fail });

    expect(loadLayout("u")).toBeNull();
    expect(() => saveLayout("u", layout())).not.toThrow();
  });
});
