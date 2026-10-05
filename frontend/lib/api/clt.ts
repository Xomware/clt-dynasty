import { request } from "./client";

// GET /clt/me (xomper-back-end api_clt_me). `member.sleeperUserId` is the
// roster mapping; `linkedSleeperUserId` is what the caller linked through
// /me/sleeper-link. Either is "" when unset.
export interface CltMe {
  member: {
    email: string;
    displayName: string;
    role: string;
    sleeperUserId: string;
  };
  linkedSleeperUserId: string;
}

export const getCltMe = () => request<CltMe>("/clt/me");
