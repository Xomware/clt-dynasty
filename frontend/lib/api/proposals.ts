import { request } from "./client";

// A rule proposal as api_clt_proposals shapes it. Names are display names;
// a member who has since left the roster comes back as "".
export interface Proposal {
  id: string;
  title: string;
  description: string;
  status: "open" | "approved" | "rejected" | "closed";
  proposedBy: string;
  isMine: boolean;
  createdAt: string;
  updatedAt: string;
  yesCount: number;
  noCount: number;
  myVote: Vote | null;
  voters: Record<Vote, string[]>;
}

export type Vote = "yes" | "no";

const post = <T>(path: string, body: unknown) => request<T>(path, { method: "POST", body: JSON.stringify(body) });

// Open first, then newest.
export const listProposals = () => request<{ proposals: Proposal[] }>("/clt/proposals-list").then((r) => r.proposals);

export const createProposal = (title: string, description: string) =>
  post<{ proposal: Proposal }>("/clt/proposals-create", { title, description }).then((r) => r.proposal);

// Final: a second vote 409s, as does a vote on a proposal that isn't open.
export const voteProposal = (proposalId: string, vote: Vote) =>
  post<{ proposalId: string; vote: Vote }>("/clt/proposals-vote", { proposalId, vote });

export const deleteProposal = (proposalId: string) => post<{ deleted: string }>("/clt/proposals-delete", { proposalId });

export const setProposalStatus = (proposalId: string, status: Proposal["status"]) =>
  post<{ proposal: Proposal }>("/clt/proposals-status", { proposalId, status }).then((r) => r.proposal);
