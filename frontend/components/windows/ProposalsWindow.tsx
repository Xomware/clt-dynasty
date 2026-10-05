"use client";

import { type FormEvent, useEffect, useId, useState } from "react";

import { LoadError } from "@/components/xp/LoadError";
import { useAlerts } from "@/lib/alerts/alerts";
import {
  createProposal,
  deleteProposal,
  listProposals,
  type Proposal,
  setProposalStatus,
  type Vote,
  voteProposal,
} from "@/lib/api/proposals";
import { useMember } from "@/lib/member/use-member";

import "./proposals.css";
import "./settings.css";

type Load = { status: "loading" } | { status: "error"; message: string } | { status: "ok"; proposals: Proposal[] };

const STATUS: Record<Proposal["status"], string> = { open: "Open", approved: "Approved", rejected: "Rejected", closed: "Closed" };
const DATE = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

// The order the list route returns: open first, then newest.
const sorted = (list: Proposal[]) =>
  [...list].sort((a, b) => Number(b.status === "open") - Number(a.status === "open") || b.createdAt.localeCompare(a.createdAt));

const names = (list: string[]) => list.map((n) => n || "Former member").join(", ");

export function ProposalsWindow() {
  const [load, setLoad] = useState<Load>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [composing, setComposing] = useState(false);

  useEffect(() => {
    let live = true;
    listProposals().then(
      (proposals) => live && setLoad({ status: "ok", proposals }),
      (e: Error) => live && setLoad({ status: "error", message: e.message }),
    );
    return () => {
      live = false;
    };
  }, [attempt]);

  if (load.status === "loading") return <p role="status">Loading proposals...</p>;
  if (load.status === "error") {
    return (
      <LoadError
        what="proposals"
        message={load.message}
        onRetry={() => {
          setLoad({ status: "loading" });
          setAttempt((n) => n + 1);
        }}
      />
    );
  }

  const { proposals } = load;
  const replace = (id: string, next: Proposal | null) =>
    setLoad({ status: "ok", proposals: sorted(proposals.flatMap((p) => (p.id !== id ? [p] : next ? [next] : []))) });

  return (
    <div className="grid grid-cols-1 gap-3">
      {composing ? (
        <NewProposal
          onCancel={() => setComposing(false)}
          onCreated={(p) => {
            setComposing(false);
            setLoad({ status: "ok", proposals: sorted([p, ...proposals]) });
          }}
        />
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p>Rule changes the league is voting on. Votes are final.</p>
          <button type="button" className="xp-button" onClick={() => setComposing(true)}>
            New proposal
          </button>
        </div>
      )}
      {proposals.length === 0 ? (
        <p>No proposals yet. Start one with New proposal.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-3" aria-label="Proposals">
          {proposals.map((p) => (
            <li key={p.id}>
              <ProposalCard proposal={p} onChange={(next) => replace(p.id, next)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface NewProposalProps {
  onCancel: () => void;
  onCreated: (proposal: Proposal) => void;
}

function NewProposal({ onCancel, onCreated }: NewProposalProps) {
  const id = useId();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    setError(null);
    await createProposal(title.trim(), description.trim()).then(onCreated, (err: Error) => setError(err.message));
    setBusy(false);
  };

  return (
    <form className="xp-group flex flex-col gap-2" aria-labelledby={`${id}-heading`} onSubmit={(e) => void submit(e)}>
      <h3 id={`${id}-heading`} className="xp-group-title">
        New proposal
      </h3>
      <label htmlFor={`${id}-title`} className="font-bold">
        Title
      </label>
      <input
        id={`${id}-title`}
        className="xp-input"
        value={title}
        maxLength={120}
        required
        autoFocus
        onChange={(e) => setTitle(e.target.value)}
      />
      <label htmlFor={`${id}-description`} className="font-bold">
        Details <span className="font-normal">(optional)</span>
      </label>
      <textarea
        id={`${id}-description`}
        className="xp-input proposal-textarea"
        value={description}
        maxLength={2000}
        rows={4}
        onChange={(e) => setDescription(e.target.value)}
      />
      {error && <p role="alert">Couldn&rsquo;t post the proposal: {error}</p>}
      <div className="flex gap-2">
        <button type="submit" className="xp-button" disabled={busy || !title.trim()}>
          {busy ? "Posting..." : "Post proposal"}
        </button>
        <button type="button" className="xp-button" disabled={busy} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}

interface CardProps {
  proposal: Proposal;
  onChange: (next: Proposal | null) => void;
}

function ProposalCard({ proposal: p, onChange }: CardProps) {
  const { alert } = useAlerts();
  const member = useMember().state;
  const me = member.status === "member" ? member.me : null;
  const isAdmin = me?.isAdmin ?? false;
  const headingId = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (failed: string, action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    await action().catch((e: Error) => setError(`${failed}: ${e.message}`));
    setBusy(false);
  };

  const vote = async (choice: Vote) => {
    const answer = await alert({
      kind: "warning",
      title: "Cast your vote",
      body: `Vote ${choice === "yes" ? "Yes" : "No"} on "${p.title}"? Votes are final.`,
      buttons: ["Vote", "Cancel"],
    });
    if (answer !== "Vote") return;
    await run("Couldn’t record your vote", async () => {
      await voteProposal(p.id, choice);
      const mine = me?.member.displayName ?? "";
      onChange({
        ...p,
        myVote: choice,
        yesCount: p.yesCount + Number(choice === "yes"),
        noCount: p.noCount + Number(choice === "no"),
        voters: { ...p.voters, [choice]: [...p.voters[choice], mine] },
      });
    });
  };

  const remove = async () => {
    const answer = await alert({
      kind: "warning",
      title: "Delete proposal",
      body: `Delete "${p.title}" and every vote on it?`,
      buttons: ["Delete", "Cancel"],
    });
    if (answer !== "Delete") return;
    await run("Couldn’t delete the proposal", async () => {
      await deleteProposal(p.id);
      onChange(null);
    });
  };

  return (
    <article className="xp-group proposal" aria-labelledby={headingId}>
      <div className="flex flex-wrap items-start gap-2">
        <h3 id={headingId} className="min-w-0 flex-1 font-bold break-words">
          {p.title}
        </h3>
        <span className="xp-tag proposal-status" data-status={p.status}>
          {STATUS[p.status]}
        </span>
      </div>
      <p className="text-xs">
        Proposed by {p.isMine ? "you" : p.proposedBy || "a former member"} on {DATE.format(new Date(p.createdAt))}
      </p>
      {p.description && <p className="proposal-description">{p.description}</p>}
      <dl className="proposal-votes">
        <dt>Yes {p.yesCount}</dt>
        <dd>{p.voters.yes.length ? names(p.voters.yes) : "No votes"}</dd>
        <dt>No {p.noCount}</dt>
        <dd>{p.voters.no.length ? names(p.voters.no) : "No votes"}</dd>
      </dl>
      <div className="flex flex-wrap items-center gap-2">
        {p.myVote ? (
          <p className="font-bold">You voted {p.myVote === "yes" ? "Yes" : "No"}</p>
        ) : p.status === "open" ? (
          (["yes", "no"] as const).map((choice) => (
              <button
                key={choice}
                type="button"
                className="xp-button"
                disabled={busy}
                onClick={(e) => {
                  // Safari never focuses a clicked button, and the dialog restores focus to its opener.
                  e.currentTarget.focus();
                  void vote(choice);
                }}
              >
                Vote {choice === "yes" ? "Yes" : "No"}
              </button>
            ))
        ) : (
          <p>Voting is closed.</p>
        )}
        <span className="ml-auto flex flex-wrap gap-2">
          {isAdmin && (
            <StatusPicker
              proposal={p}
              busy={busy}
              onPick={(status) =>
                void run("Couldn’t change the status", async () => onChange(await setProposalStatus(p.id, status)))
              }
            />
          )}
          {(p.isMine || isAdmin) && (
            <button
              type="button"
              className="xp-button"
              disabled={busy}
              onClick={(e) => {
                e.currentTarget.focus();
                void remove();
              }}
            >
              Delete
            </button>
          )}
        </span>
      </div>
      {error && <p role="alert">{error}</p>}
    </article>
  );
}

interface StatusPickerProps {
  proposal: Proposal;
  busy: boolean;
  onPick: (status: Proposal["status"]) => void;
}

function StatusPicker({ proposal, busy, onPick }: StatusPickerProps) {
  const id = useId();
  return (
    <span className="flex items-center gap-2">
      <label htmlFor={id} className="text-xs font-bold">
        Status
      </label>
      <select
        id={id}
        className="xp-select"
        value={proposal.status}
        disabled={busy}
        onChange={(e) => onPick(e.target.value as Proposal["status"])}
      >
        {Object.entries(STATUS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
    </span>
  );
}
