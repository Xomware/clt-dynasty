"use client";

import { type FormEvent, useEffect, useId, useState } from "react";

import { AdminOnly } from "@/components/xp/AdminOnly";
import { LoadError } from "@/components/xp/LoadError";
import { useAlerts } from "@/lib/alerts/alerts";
import { type Announcement, announcements as homeAnnouncements } from "@/lib/announcements";
import {
  type AnnouncementFields,
  createAnnouncement,
  deleteAnnouncement,
  listAllAnnouncements,
  updateAnnouncement,
} from "@/lib/api/admin-announcements";

import "./proposals.css";
import "./settings.css";

type Load =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ok"; rows: Announcement[] };

const DATE = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});
const BLANK: AnnouncementFields = { title: "", body: "", priority: "info", expires_at: null, is_active: true, display_order: 0 };

// Home's order: critical first, then display_order.
const sorted = (rows: Announcement[]) =>
  [...rows].sort(
    (a, b) => Number(b.priority === "critical") - Number(a.priority === "critical") || a.display_order - b.display_order,
  );

const expired = (a: Announcement) => a.expires_at !== null && new Date(a.expires_at).getTime() <= Date.now();

// <input type="datetime-local"> speaks local wall time without a zone; the API stores ISO.
const toLocalInput = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};
const fromLocalInput = (value: string) => (value ? new Date(value).toISOString() : null);

export function AdminAnnouncementsWindow() {
  return (
    <AdminOnly>
      <Announcements />
    </AdminOnly>
  );
}

function Announcements() {
  const [load, setLoad] = useState<Load>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [editing, setEditing] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    listAllAnnouncements().then(
      (r) => live && setLoad({ status: "ok", rows: sorted(r.rows) }),
      (e: Error) => live && setLoad({ status: "error", message: e.message }),
    );
    return () => {
      live = false;
    };
  }, [attempt]);

  if (load.status === "loading") return <p role="status">Loading announcements...</p>;
  if (load.status === "error") {
    return (
      <LoadError
        what="announcements"
        message={load.message}
        onRetry={() => {
          setLoad({ status: "loading" });
          setAttempt((n) => n + 1);
        }}
      />
    );
  }

  const { rows } = load;
  // Home reads the public list, so it catches up after every change here.
  const changed = (next: Announcement[]) => {
    setEditing(null);
    setLoad({ status: "ok", rows: sorted(next) });
    homeAnnouncements.refresh();
  };
  const put = (row: Announcement) =>
    changed(rows.some((r) => r.id === row.id) ? rows.map((r) => (r.id === row.id ? row : r)) : [...rows, row]);

  return (
    <div className="grid grid-cols-1 gap-3">
      {editing === "new" ? (
        <AnnouncementForm
          heading="New announcement"
          initial={BLANK}
          submitLabel="Post"
          onCancel={() => setEditing(null)}
          onSubmit={async (fields) => put(await createAnnouncement(fields))}
        />
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p>Shown on everyone&rsquo;s Home window, important ones first.</p>
          <button type="button" className="xp-button" onClick={() => setEditing("new")}>
            New announcement
          </button>
        </div>
      )}
      {rows.length === 0 ? (
        <p>No announcements yet. Post the first one with New announcement.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-3" aria-label="Announcements">
          {rows.map((a) => (
            <li key={a.id}>
              {editing === a.id ? (
                <AnnouncementForm
                  heading={`Edit "${a.title}"`}
                  initial={a}
                  submitLabel="Save"
                  onCancel={() => setEditing(null)}
                  onSubmit={async (fields) => put(await updateAnnouncement(a.id, changes(a, fields)))}
                />
              ) : (
                <AnnouncementCard announcement={a} onEdit={() => setEditing(a.id)} onDeleted={put} />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// The update route refuses an empty `fields`, so the Save button needs at least one change.
function changes(before: AnnouncementFields, after: AnnouncementFields): Partial<AnnouncementFields> {
  return Object.fromEntries(
    (Object.keys(BLANK) as (keyof AnnouncementFields)[]).filter((k) => before[k] !== after[k]).map((k) => [k, after[k]]),
  );
}

interface CardProps {
  announcement: Announcement;
  onEdit: () => void;
  onDeleted: (row: Announcement) => void;
}

function AnnouncementCard({ announcement: a, onEdit, onDeleted }: CardProps) {
  const { alert } = useAlerts();
  const headingId = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remove = async () => {
    const answer = await alert({
      kind: "warning",
      title: "Take down announcement",
      body: `Take "${a.title}" off Home? It stays here as inactive.`,
      buttons: ["Take down", "Cancel"],
    });
    if (answer !== "Take down") return;
    setBusy(true);
    setError(null);
    await deleteAnnouncement(a.id).then(onDeleted, (e: Error) => setError(e.message));
    setBusy(false);
  };

  return (
    <article className="xp-group proposal" aria-labelledby={headingId} data-inactive={!a.is_active || undefined}>
      <div className="flex flex-wrap items-start gap-2">
        <h3 id={headingId} className="min-w-0 flex-1 font-bold break-words">
          {a.title}
        </h3>
        {a.priority === "critical" && <span className="xp-tag">Important</span>}
        {!a.is_active && <span className="xp-tag proposal-status" data-status="closed">Inactive</span>}
        {a.is_active && expired(a) && <span className="xp-tag proposal-status" data-status="closed">Expired</span>}
      </div>
      <p className="proposal-description">{a.body}</p>
      <p className="text-xs">
        Order {a.display_order}
        {a.expires_at ? `, ${expired(a) ? "expired" : "expires"} ${DATE.format(new Date(a.expires_at))}` : ", no expiry"}
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="xp-button" disabled={busy} onClick={onEdit}>
          Edit
        </button>
        {a.is_active && (
          <button
            type="button"
            className="xp-button"
            disabled={busy}
            onClick={(e) => {
              // Safari never focuses a clicked button, and the dialog restores focus to its opener.
              e.currentTarget.focus();
              void remove();
            }}
          >
            {busy ? "Taking down..." : "Take down"}
          </button>
        )}
      </div>
      {error && <p role="alert">Couldn&rsquo;t take it down: {error}</p>}
    </article>
  );
}

interface FormProps {
  heading: string;
  initial: AnnouncementFields;
  submitLabel: string;
  onCancel: () => void;
  onSubmit: (fields: AnnouncementFields) => Promise<void>;
}

function AnnouncementForm({ heading, initial, submitLabel, onCancel, onSubmit }: FormProps) {
  const id = useId();
  const [title, setTitle] = useState(initial.title);
  const [body, setBody] = useState(initial.body);
  const [critical, setCritical] = useState(initial.priority === "critical");
  const [expires, setExpires] = useState(toLocalInput(initial.expires_at));
  const [order, setOrder] = useState(String(initial.display_order));
  const [active, setActive] = useState(initial.is_active);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fields: AnnouncementFields = {
    title: title.trim(),
    body: body.trim(),
    priority: critical ? "critical" : "info",
    // An untouched expiry keeps the stored value, so re-saving can't drift it by seconds.
    expires_at: expires === toLocalInput(initial.expires_at) ? initial.expires_at : fromLocalInput(expires),
    is_active: active,
    display_order: Number(order) || 0,
  };
  const ready = fields.title && fields.body && Object.keys(changes(initial, fields)).length > 0;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!ready) return;
    setBusy(true);
    setError(null);
    await onSubmit(fields).catch((err: Error) => {
      setError(err.message);
      setBusy(false);
    });
  };

  return (
    <form className="xp-group flex flex-col gap-2" aria-labelledby={`${id}-heading`} onSubmit={(e) => void submit(e)}>
      <h3 id={`${id}-heading`} className="xp-group-title break-words">
        {heading}
      </h3>
      <label htmlFor={`${id}-title`} className="font-bold">
        Title
      </label>
      <input id={`${id}-title`} className="xp-input" value={title} required onChange={(e) => setTitle(e.target.value)} />
      <label htmlFor={`${id}-body`} className="font-bold">
        Message
      </label>
      <textarea
        id={`${id}-body`}
        className="xp-input proposal-textarea"
        value={body}
        rows={4}
        required
        onChange={(e) => setBody(e.target.value)}
      />
      <label className="settings-check">
        <input type="checkbox" checked={critical} onChange={(e) => setCritical(e.target.checked)} />
        Important: show it first, with a warning mark
      </label>
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        <div className="flex flex-col gap-1">
          <label htmlFor={`${id}-expires`} className="font-bold">
            Expires <span className="font-normal">(optional)</span>
          </label>
          <input
            id={`${id}-expires`}
            className="xp-input"
            type="datetime-local"
            value={expires}
            onChange={(e) => setExpires(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={`${id}-order`} className="font-bold">
            Order
          </label>
          <input
            id={`${id}-order`}
            className="xp-input w-24"
            type="number"
            inputMode="numeric"
            value={order}
            onChange={(e) => setOrder(e.target.value)}
          />
        </div>
      </div>
      <label className="settings-check">
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
        Active: shown on Home
      </label>
      {error && <p role="alert">Couldn&rsquo;t save: {error}</p>}
      <div className="flex gap-2">
        <button type="submit" className="xp-button" disabled={busy || !ready}>
          {busy ? "Saving..." : submitLabel}
        </button>
        <button type="button" className="xp-button" disabled={busy} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
