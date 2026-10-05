import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("aws-amplify/auth", () => ({ signOut: vi.fn(), getCurrentUser: vi.fn(), fetchAuthSession: vi.fn() }));
vi.mock("aws-amplify/utils", () => ({ Hub: { listen: vi.fn(() => () => {}) } }));

import { PhoneShell } from "./PhoneShell";

describe("phone shell with no windows registered", () => {
  it("says the league windows are on their way", () => {
    render(<PhoneShell />);
    expect(screen.getByText("League windows land here as they’re built.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeTruthy();
  });
});
