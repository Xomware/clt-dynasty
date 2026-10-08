import { describe, expect, it } from "vitest";

import { designation, designationText, LEGEND, sidelined } from "./injury";

describe("injury designations", () => {
  it("maps each of Sleeper's injury_status values to its badge", () => {
    const codes = ["Questionable", "Doubtful", "Out", "IR", "PUP", "Sus", "COV", "NA", "DNR"].map((s) => designation({ injury_status: s })?.code);
    expect(codes).toEqual(["Q", "D", "O", "IR", "PUP", "SUS", "COV", "NA", "DNR"]);
  });

  it("reads a non-football injury from the status, and nothing from a healthy player", () => {
    expect(designation({ status: "Non Football Injury" })?.code).toBe("NFI");
    expect(designation({ injury_status: "" })).toBeNull();
    expect(designation({ status: "Active" })).toBeNull();
  });

  it("keeps a value Sleeper adds later instead of dropping it", () => {
    expect(designation({ injury_status: "Probable" })).toEqual({ code: "PRO", label: "Probable" });
  });

  it("only Q and D may still play", () => {
    expect(LEGEND.filter((d) => !sidelined(d)).map((d) => d.code)).toEqual(["Q", "D"]);
  });

  it("names the body part when Sleeper has it", () => {
    const d = designation({ injury_status: "Questionable" });
    expect(d && designationText(d, "Hamstring")).toBe("Questionable: Hamstring");
    expect(d && designationText(d, null)).toBe("Questionable");
  });
});
