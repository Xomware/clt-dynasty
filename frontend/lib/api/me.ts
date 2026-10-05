import { request } from "./client";

// Xomper's platform user (xomper-back-end api_users_me `_shape`). Unset
// strings are "".
export interface PlatformUser {
  userId: string;
  email: string;
  sleeperUserId: string;
  sleeperUsername: string;
  sleeperAvatar: string;
  displayName: string;
  hasLinkedSleeper: boolean;
  createdAt: string;
  updatedAt: string;
}

interface UserEnvelope {
  user: PlatformUser;
}

const user = (p: Promise<UserEnvelope>) => p.then((r) => r.user);

export const getProfile = () => user(request<UserEnvelope>("/me/profile"));

// Xomper resolves the handle against Sleeper and 400s an unknown one.
export const linkSleeper = (sleeperUsername: string) =>
  user(request<UserEnvelope>("/me/sleeper-link", { method: "PUT", body: JSON.stringify({ sleeperUsername }) }));

export const unlinkSleeper = () => user(request<UserEnvelope>("/me/sleeper-unlink", { method: "DELETE" }));
