import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("aws-amplify/auth", () => ({ fetchAuthSession: vi.fn() }));

import { fetchAuthSession } from "aws-amplify/auth";

import { ApiError, request } from "./client";

const session = (token: string | null) =>
  vi.mocked(fetchAuthSession).mockResolvedValue({
    tokens: token ? { idToken: { toString: () => token } } : undefined,
  } as unknown as Awaited<ReturnType<typeof fetchAuthSession>>);

const reply = (status: number, body: unknown) =>
  vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(body), { status }));

afterEach(() => {
  vi.restoreAllMocks();
});

describe("request", () => {
  it("refuses to call without a session", async () => {
    session(null);
    const fetch = vi.spyOn(globalThis, "fetch");
    await expect(request("/clt/me")).rejects.toMatchObject({ status: 401 });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("reads a Xomper handler's error message and status", async () => {
    session("t");
    reply(400, { error: { message: "No Sleeper account found for 'nobody'", status: 400 } });
    const err = await request("/me/sleeper-link", { method: "PUT" }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 400, message: "No Sleeper account found for 'nobody'" });
  });

  it("reads the authorizer's bare message", async () => {
    session("t");
    reply(403, { message: "User is not authorized to access this resource" });
    await expect(request("/players/list")).rejects.toMatchObject({
      status: 403,
      message: "User is not authorized to access this resource",
    });
  });

  it("falls back to the status when the body is not JSON", async () => {
    session("t");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("<html>", { status: 502 }));
    await expect(request("/clt/me")).rejects.toMatchObject({ status: 502, message: "Request failed (502)" });
  });
});
