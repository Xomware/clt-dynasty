import { fetchAuthSession } from "aws-amplify/auth";

import { API_BASE } from "@/lib/config";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// Xomper handlers answer `{ error: { message } }`; the authorizer and API
// Gateway answer `{ message }`.
function messageOf(body: unknown, status: number): string {
  if (body && typeof body === "object") {
    const { error, message } = body as { error?: { message?: unknown }; message?: unknown };
    if (typeof error?.message === "string") return error.message;
    if (typeof message === "string") return message;
  }
  return `Request failed (${status})`;
}

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  // The ID token, not the access token: only the ID token carries `email`,
  // which the CLT member gate looks up. Amplify caches and refreshes it.
  const session = await fetchAuthSession();
  const token = session.tokens?.idToken?.toString();
  if (!token) throw new ApiError(401, "Not signed in");

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
  });
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, messageOf(body, res.status));
  return body as T;
}
