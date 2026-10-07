import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// amplify.ts reads the client id at import time, so it must exist before any import.
vi.hoisted(() => {
  process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID = "test-client";
});

const nav = vi.hoisted(() => ({ pathname: "/", replace: vi.fn() }));

vi.mock("aws-amplify", () => ({ Amplify: { configure: vi.fn() } }));
vi.mock("aws-amplify/auth", () => ({
  getCurrentUser: vi.fn(),
  fetchAuthSession: vi.fn(),
  signInWithRedirect: vi.fn(),
  signOut: vi.fn(),
}));
vi.mock("aws-amplify/utils", () => ({ Hub: { listen: vi.fn(() => () => {}) } }));
vi.mock("next/navigation", () => ({
  usePathname: () => nav.pathname,
  useRouter: () => ({ replace: nav.replace }),
}));

import { Amplify } from "aws-amplify";
import { fetchAuthSession, getCurrentUser, signInWithRedirect } from "aws-amplify/auth";

import AuthCallbackPage from "@/app/auth/callback/page";
import { AuthGate } from "./auth-gate";

const ME = {
  member: { email: "member@example.com", displayName: "Roster 4", role: "member", sleeperUserId: "400" },
  linkedSleeperUserId: "400",
};

function signedIn() {
  vi.mocked(getCurrentUser).mockResolvedValue({ username: "u", userId: "u" });
  vi.mocked(fetchAuthSession).mockResolvedValue({
    tokens: { idToken: { payload: { email: "member@example.com" }, toString: () => "id-token" } },
  } as unknown as Awaited<ReturnType<typeof fetchAuthSession>>);
}

const reply = (status: number, body: unknown) =>
  vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(body), { status }));

beforeEach(() => {
  nav.pathname = "/";
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("AuthGate", () => {
  it("configures the shared pool's hosted UI with the build's client id", () => {
    const config = vi.mocked(Amplify.configure).mock.calls[0]?.[0] as {
      Auth: { Cognito: { userPoolId: string; userPoolClientId: string; loginWith: { oauth: { domain: string } } } };
    };
    expect(config.Auth.Cognito).toMatchObject({
      userPoolId: "us-east-1_ZrN8NaaIv",
      userPoolClientId: "test-client",
      loginWith: { oauth: { domain: "xomware-auth.auth.us-east-1.amazoncognito.com" } },
    });
  });

  it("shows the sign-in screen when signed out, and signs in with Google only", async () => {
    vi.mocked(getCurrentUser).mockRejectedValue(new Error("not signed in"));
    // The landing's public Sleeper reads; this test only cares about sign-in.
    vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise(() => {}));
    render(<AuthGate>league content</AuthGate>);

    expect(await screen.findByRole("heading", { level: 1, name: "CLT Dynasty" })).toBeTruthy();
    fireEvent.click(screen.getAllByRole("button", { name: "Sign in with Google" })[0]);
    expect(signInWithRedirect).toHaveBeenCalledWith({ provider: "Google" });
    expect(screen.queryByText("league content")).toBeNull();
  });

  it("renders the site for a roster member", async () => {
    signedIn();
    const fetch = reply(200, ME);
    render(<AuthGate>league content</AuthGate>);

    expect(await screen.findByText("league content")).toBeTruthy();
    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe("https://api.xomper.xomware.com/clt/me");
    expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer id-token");
  });

  it("checks the roster before showing anything", async () => {
    signedIn();
    vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise(() => {}));
    render(<AuthGate>league content</AuthGate>);

    await waitFor(() => expect(screen.getByRole("status").textContent).toMatch(/checking the roster/i));
    expect(screen.queryByText("league content")).toBeNull();
  });

  it("tells a signed-in Google account that isn't on the roster, and offers sign out", async () => {
    signedIn();
    reply(403, { error: { message: "not on the CLT roster", status: 403 } });
    render(<AuthGate>league content</AuthGate>);

    expect(await screen.findByRole("heading", { name: "You’re not on the roster" })).toBeTruthy();
    expect(screen.getByText("member@example.com")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Sign out" })).toBeTruthy();
    expect(screen.queryByText("league content")).toBeNull();
  });

  it("shows a failed roster check with its reason, and retries", async () => {
    signedIn();
    const fetch = reply(500, { error: { message: "DynamoDB is down" } });
    render(<AuthGate>league content</AuthGate>);

    expect((await screen.findByRole("alert")).textContent).toBe("DynamoDB is down");
    fetch.mockResolvedValue(new Response(JSON.stringify(ME), { status: 200 }));
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByText("league content")).toBeTruthy();
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("always renders the callback route, even signed out", async () => {
    vi.mocked(getCurrentUser).mockRejectedValue(new Error("not signed in"));
    nav.pathname = "/auth/callback/";
    render(
      <AuthGate>
        <AuthCallbackPage />
      </AuthGate>,
    );

    expect(screen.getByRole("status").textContent).toMatch(/signing you in/i);
    await waitFor(() => expect(getCurrentUser).toHaveBeenCalled());
    expect(screen.queryByRole("button", { name: "Sign in with Google" })).toBeNull();
  });
});
