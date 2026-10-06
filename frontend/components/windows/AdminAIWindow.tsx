"use client";

import { type FormEvent, useEffect, useId, useState } from "react";

import { isRedacted, ReportView } from "@/components/windows/AIReviewWindow";
import { AdminOnly } from "@/components/xp/AdminOnly";
import { LoadError } from "@/components/xp/LoadError";
import { Tabs } from "@/components/xp/Tabs";
import { useAlerts } from "@/lib/alerts/alerts";
import { flagReport, type ReportFlag, runTrigger, type Trigger, type TriggerResult } from "@/lib/api/admin-ai";
import { type AIReport, listReports, periodLabel, REPORT_LABEL } from "@/lib/api/ai-reports";
import type { WindowParams } from "@/lib/desktop/windows";

import "./ai-review.css";
import "./settings.css";

const TRIGGERS: { id: Trigger; label: string; hint: string; weekly: boolean }[] = [
  { id: "weekly", label: "Weekly recap", hint: "Reviews a finished week. Defaults to the current week.", weekly: true },
  { id: "week-preview", label: "Week preview", hint: "Previews the coming week's games. Defaults to the upcoming week.", weekly: true },
  { id: "preseason", label: "Preseason", hint: "Power rankings before Week 1. Refused once the season starts.", weekly: false },
  { id: "postdraft", label: "Post-draft", hint: "Grades the rookie draft. Refused until the draft is complete.", weekly: false },
];

export function AdminAIWindow({ params }: { params: WindowParams }) {
  return (
    <AdminOnly>
      <Tabs
        label="Admin AI Review"
        selected={params.tab}
        tabs={[
          { id: "generate", label: "Generate", panel: () => <Generate /> },
          { id: "reports", label: "Reports", panel: () => <Reports /> },
        ]}
      />
    </AdminOnly>
  );
}

type Run = { status: "idle" } | { status: "running" } | { status: "error"; message: string } | { status: "done"; result: TriggerResult };

function Generate() {
  const id = useId();
  const { alert } = useAlerts();
  const [trigger, setTrigger] = useState<Trigger>("weekly");
  const [dryRun, setDryRun] = useState(true);
  const [force, setForce] = useState(false);
  const [week, setWeek] = useState("");
  const [run, setRun] = useState<Run>({ status: "idle" });
  const spec = TRIGGERS.find((t) => t.id === trigger) ?? TRIGGERS[0];

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!dryRun) {
      const answer = await alert({
        kind: "warning",
        title: "Send to the league",
        body: `Generate the ${spec.label.toLowerCase()} and email it to every member? A dry run sends it to you alone.`,
        buttons: ["Send", "Cancel"],
      });
      if (answer !== "Send") return;
    }
    setRun({ status: "running" });
    const options = { dry_run: dryRun, force, ...(spec.weekly && week ? { week: Number(week) } : {}) };
    await runTrigger(trigger, options).then(
      (result) => setRun({ status: "done", result }),
      (err: Error) => setRun({ status: "error", message: err.message }),
    );
  };

  const busy = run.status === "running";
  return (
    <div className="grid grid-cols-1 gap-3">
      <form className="xp-group flex flex-col gap-2" onSubmit={(e) => void submit(e)} aria-label="Generate a report">
        <label htmlFor={`${id}-trigger`} className="font-bold">
          Report
        </label>
        <select
          id={`${id}-trigger`}
          className="xp-select"
          value={trigger}
          disabled={busy}
          aria-describedby={`${id}-hint`}
          onChange={(e) => setTrigger(e.target.value as Trigger)}
        >
          {TRIGGERS.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
        <p id={`${id}-hint`} className="text-xs">
          {spec.hint}
        </p>
        {spec.weekly && (
          <>
            <label htmlFor={`${id}-week`} className="font-bold">
              Week <span className="font-normal">(optional)</span>
            </label>
            <input
              id={`${id}-week`}
              className="xp-input w-24"
              type="number"
              inputMode="numeric"
              min={1}
              max={18}
              value={week}
              disabled={busy}
              onChange={(e) => setWeek(e.target.value)}
            />
          </>
        )}
        <label className="settings-check">
          <input type="checkbox" checked={dryRun} disabled={busy} onChange={(e) => setDryRun(e.target.checked)} />
          Dry run: email only me, and show every member&rsquo;s email here
        </label>
        <label className="settings-check">
          <input type="checkbox" checked={force} disabled={busy} onChange={(e) => setForce(e.target.checked)} />
          Force: write over a report that already exists for this period
        </label>
        <div>
          <button type="submit" className="xp-button" disabled={busy}>
            {busy ? "Generating..." : dryRun ? "Run dry run" : "Generate and send"}
          </button>
        </div>
      </form>
      {busy && <p role="status">Writing the report. This can take a minute.</p>}
      {run.status === "error" && <p role="alert">Couldn&rsquo;t generate it: {run.message}</p>}
      {run.status === "done" && <Result result={run.result} />}
    </div>
  );
}

function Result({ result }: { result: TriggerResult }) {
  const sent = result.delivery_count ?? result.email_sent;
  return (
    <section className="grid grid-cols-1 gap-3" aria-label="Result" aria-live="polite">
      <dl className="xp-summary xp-group">
        <dt>Status</dt>
        <dd>{result.status.replace(/_/g, " ")}</dd>
        {result.period && (
          <>
            <dt>Period</dt>
            <dd>{periodLabel(result.period)}</dd>
          </>
        )}
        {sent !== undefined && (
          <>
            <dt>Emails sent</dt>
            <dd>
              {sent}
              {result.email_failed ? `, ${result.email_failed} failed` : ""}
            </dd>
          </>
        )}
        {result.token_usage && (
          <>
            <dt>Tokens</dt>
            <dd>
              {Object.entries(result.token_usage)
                .map(([k, v]) => `${k.replace(/_/g, " ")} ${v}`)
                .join(", ")}
            </dd>
          </>
        )}
      </dl>
      {result.report && <ReportView report={result.report} />}
      {result.previews && result.previews.length > 0 && (
        <section aria-labelledby="admin-ai-previews">
          <h3 id="admin-ai-previews" className="xp-round-title">
            Email previews ({result.previews.length})
          </h3>
          <ul className="ai-list">
            {result.previews.map((p) => (
              <li key={p.recipient_user_id || p.recipient_email}>
                <details className="ai-preview">
                  <summary className="xp-summary-toggle">
                    {p.display_name || p.recipient_email}: {p.subject}
                  </summary>
                  <pre className="ai-preview-text">{p.text_body}</pre>
                </details>
              </li>
            ))}
          </ul>
        </section>
      )}
    </section>
  );
}

type List = { status: "loading" } | { status: "error"; message: string } | { status: "ok"; rows: AIReport[] };

const FLAGS: [ReportFlag, string][] = [
  ["is_redacted", "Redacted: hidden from members"],
  ["do_not_broadcast", "Do not broadcast: blocks a real send"],
];

function Reports() {
  const [list, setList] = useState<List>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    listReports().then(
      (page) => live && setList({ status: "ok", rows: page.rows }),
      (e: Error) => live && setList({ status: "error", message: e.message }),
    );
    return () => {
      live = false;
    };
  }, [attempt]);

  if (list.status === "loading") return <p role="status">Loading reports...</p>;
  if (list.status === "error") {
    return (
      <LoadError
        what="reports"
        message={list.message}
        onRetry={() => {
          setList({ status: "loading" });
          setAttempt((n) => n + 1);
        }}
      />
    );
  }
  if (list.rows.length === 0) return <p>No reports yet. Generate one first.</p>;

  const replace = (next: AIReport) => setList({ status: "ok", rows: list.rows.map((r) => (r.sk === next.sk ? next : r)) });
  return (
    <ul className="ai-list" aria-label="Reports">
      {list.rows.map((r) => (
        <ReportFlags key={r.sk} report={r} onChange={replace} />
      ))}
    </ul>
  );
}

function ReportFlags({ report, onChange }: { report: AIReport; onChange: (next: AIReport) => void }) {
  const [busy, setBusy] = useState<ReportFlag | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggle = async (flag: ReportFlag, value: boolean) => {
    setBusy(flag);
    setError(null);
    await flagReport(report, flag, value).then(
      (metadata) => onChange({ ...report, metadata }),
      (e: Error) => setError(e.message),
    );
    setBusy(null);
  };

  const name = `${REPORT_LABEL[report.report_type]}, ${periodLabel(report.period)}`;
  return (
    <li className="ai-flags" aria-label={name}>
      <p className="flex flex-wrap items-center gap-2">
        <span className="xp-tag">{REPORT_LABEL[report.report_type]}</span>
        <span className="font-bold">{periodLabel(report.period)}</span>
        {isRedacted(report) && <span className="xp-tag ai-redacted">Redacted</span>}
      </p>
      <div className="flex flex-wrap gap-x-4">
        {FLAGS.map(([flag, label]) => (
          <label key={flag} className="settings-check">
            <input
              type="checkbox"
              checked={String(report.metadata[flag]) === "true"}
              disabled={busy !== null}
              onChange={(e) => void toggle(flag, e.target.checked)}
            />
            {label}
          </label>
        ))}
      </div>
      {error && <p role="alert">Couldn&rsquo;t change the flag: {error}</p>}
    </li>
  );
}
