import { request } from "./client";

// A roster row as api_clt_members shapes it. `boundToAccount` means a Google
// account has signed in as this member; another one is refused until cleared.
export interface Member {
  email: string;
  displayName: string;
  role: string;
  sleeperUserId: string;
  active: boolean;
  boundToAccount: boolean;
}

export interface MemberChanges {
  newEmail?: string;
  displayName?: string;
  active?: boolean;
  clearSub?: true;
}

export const listMembers = () => request<{ members: Member[] }>("/clt/members-list").then((r) => r.members);

// A new email always drops the account binding; 409 when another member has it.
export const updateMember = (email: string, changes: MemberChanges) =>
  request<{ member: Member }>("/clt/members-update", { method: "POST", body: JSON.stringify({ email, ...changes }) }).then(
    (r) => r.member,
  );
