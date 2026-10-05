import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import Home from "./page";

describe("placeholder home", () => {
  it("says the new site is coming together", () => {
    render(<Home />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("CLT Dynasty League — new site coming together");
    expect(screen.getByRole("region", { name: "CLT Dynasty League" })).toBeTruthy();
  });
});
