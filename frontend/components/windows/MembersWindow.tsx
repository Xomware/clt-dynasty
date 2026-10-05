"use client";

import { type FormEvent, useEffect, useId, useState } from "react";

import { AdminOnly } from "@/components/xp/AdminOnly";
import { LoadError } from "@/components/xp/LoadError";
import { ApiError } from "@/lib/api/client";
import { listMembers, type Member, type MemberChanges, updateMember } from "@/lib/api/members";

import "./members.css";
import "./settings.css";

type Load =
  | { status: "loading" }
  | { status: "error"; message: string; forbidden: boolean }
  | { status: "ok"; members: Member[] };

export function MembersWindow() {
  return (
    <AdminOnly>
      <Members />
    </AdminOnly>
  );
}

function Members() {
  const [load, setLoad] = useState<Load>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [editing, setEditing] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    listMembers().then(
      (members) => live && setLoad({ status: "ok", members }),
      (e: Error) =>
        live && setLoad({ status: "error", message: e.message, forbidden: e instanceof ApiError && e.status === 403 }),
    );
    return () => {
      live = false;
    };
  }, [attempt]);

  if (load.status === "loading") return <p role="status">Loading the roster...</p>;
  if (load.status === "error") {
    if (load.forbidden) return <p role="alert">Xomper doesn&rsquo;t recognise you as a league admin, so the roster is closed to you.</p>;
    return (
      <LoadError
        what="the roster"
        message={load.message}
        onRetry={() => {
          setLoad({ status: "loading" });
          setAttempt((n) => n + 1);
        }}
      />
    );
  }

  const { members } = load;
  if (members.length === 0) return <p>No one is on the roster yet.</p>;
  const saved = (email: string, member: Member) => {
    setEditing(null);
    setLoad({ status: "ok", members: members.map((m) => (m.email === email ? member : m)) });
  };

  return (
    <div className="grid grid-cols-1 gap-3">
      <p>
        Everyone allowed to sign in. Fix a member&rsquo;s email here when their Google account differs from the roster.
      </p>
      <ul className="members" aria-label="Roster">
        {members.map((m) => (
          <li key={m.email} className="members-row" data-inactive={!m.active || undefined}>
            <div className="flex flex-wrap items-center gap-2">
              <div className="min-w-0 flex-1">
                <p className="font-bold break-words">{m.displayName || "No name set"}</p>
                <p className="text-xs break-all">{m.email}</p>
              </div>
              {m.role && m.role !== "member" && <span className="xp-tag">{m.role}</span>}
              {!m.active && <span className="xp-tag members-off">Inactive</span>}
              {!m.boundToAccount && <span className="xp-tag members-off">Not signed in yet</span>}
              {editing !== m.email && (
                <button
                  type="button"
                  className="xp-button"
                  aria-label={`Edit ${m.displayName || m.email}`}
                  onClick={() => setEditing(m.email)}
                >
                  Edit
                </button>
              )}
            </div>
            {editing === m.email && (
              <EditMember member={m} onCancel={() => setEditing(null)} onSaved={(next) => saved(m.email, next)} />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

interface EditProps {
  member: Member;
  onCancel: () => void;
  onSaved: (member: Member) => void;
}

function EditMember({ member, onCancel, onSaved }: EditProps) {
  const id = useId();
  const [name, setName] = useState(member.displayName);
  const [email, setEmail] = useState(member.email);
  const [active, setActive] = useState(member.active);
  const [clearSub, setClearSub] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Only what changed goes up: the API refuses an update that changes nothing.
  const changes: MemberChanges = {
    ...(name.trim() !== member.displayName && { displayName: name.trim() }),
    ...(email.trim().toLowerCase() !== member.email && { newEmail: email.trim() }),
    ...(active !== member.active && { active }),
    ...(clearSub && { clearSub: true as const }),
  };
  const changed = Object.keys(changes).length > 0;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!changed || !name.trim()) return;
    setBusy(true);
    setError(null);
    await updateMember(member.email, changes).then(onSaved, (err: Error) => setError(err.message));
    setBusy(false);
  };

  return (
    <form className="members-edit" aria-label={`Edit ${member.displayName || member.email}`} onSubmit={(e) => void submit(e)}>
      <label htmlFor={`${id}-name`} className="font-bold">
        Display name
      </label>
      <input
        id={`${id}-name`}
        className="xp-input"
        value={name}
        maxLength={50}
        required
        onChange={(e) => setName(e.target.value)}
      />
      <label htmlFor={`${id}-email`} className="font-bold">
        Email
      </label>
      <input
        id={`${id}-email`}
        className="xp-input"
        type="email"
        value={email}
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        required
        aria-describedby={`${id}-email-note`}
        onChange={(e) => setEmail(e.target.value)}
      />
      <p id={`${id}-email-note`} className="text-xs">
        A new email is a new Google account: they sign in again with it.
      </p>
      <label className="members-check">
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
        Active: can sign in and vote
      </label>
      {member.boundToAccount && (
        <label className="members-check">
          <input type="checkbox" checked={clearSub} onChange={(e) => setClearSub(e.target.checked)} />
          Unlink their Google account, so the next one to sign in with this email takes the seat
        </label>
      )}
      {error && <p role="alert">Couldn&rsquo;t save: {error}</p>}
      <div className="flex gap-2">
        <button type="submit" className="xp-button" disabled={busy || !changed || !name.trim()}>
          {busy ? "Saving..." : "Save"}
        </button>
        <button type="button" className="xp-button" disabled={busy} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
