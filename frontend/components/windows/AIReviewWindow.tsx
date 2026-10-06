"use client";

import { useEffect, useId, useState } from "react";

import { DrillLink } from "@/components/xp/DrillLink";
import { LoadError } from "@/components/xp/LoadError";
import { Markdown } from "@/components/xp/Markdown";
import {
  type AIReport,
  findReport,
  listReports,
  periodLabel,
  REPORT_LABEL,
  type ReportType,
} from "@/lib/api/ai-reports";
import type { WindowLink } from "@/lib/desktop/deep-link";
import type { WindowParams } from "@/lib/desktop/windows";
import { useLoad } from "@/lib/use-load";

import "./ai-review.css";

const DATE = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });
const TYPES = Object.keys(REPORT_LABEL) as ReportType[];

export const isRedacted = (r: AIReport) => String(r.metadata.is_redacted) === "true";

export const reportLink = (r: AIReport): WindowLink => ({
  kind: "ai-report",
  params: { type: r.report_type, period: r.period },
});

type List =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ok"; rows: AIReport[]; next: string | null };

export function AIReviewWindow() {
  const filterId = useId();
  const [type, setType] = useState<ReportType | "">("");
  const [list, setList] = useState<List>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [more, setMore] = useState<{ busy: boolean; error: string | null }>({ busy: false, error: null });

  useEffect(() => {
    let live = true;
    listReports(type || undefined).then(
      (page) => live && setList({ status: "ok", rows: page.rows, next: page.next_cursor }),
      (e: Error) => live && setList({ status: "error", message: e.message }),
    );
    return () => {
      live = false;
    };
  }, [type, attempt]);

  const loadMore = async () => {
    if (list.status !== "ok" || !list.next) return;
    setMore({ busy: true, error: null });
    try {
      const page = await listReports(type || undefined, list.next);
      setList({ status: "ok", rows: [...list.rows, ...page.rows], next: page.next_cursor });
      setMore({ busy: false, error: null });
    } catch (e) {
      setMore({ busy: false, error: (e as Error).message });
    }
  };

  return (
    <div className="grid grid-cols-1 gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={filterId} className="font-bold">
          Show
        </label>
        <select
          id={filterId}
          className="xp-select"
          value={type}
          onChange={(e) => {
            setType(e.target.value as ReportType | "");
            setList({ status: "loading" });
          }}
        >
          <option value="">Every report</option>
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {REPORT_LABEL[t]}
            </option>
          ))}
        </select>
      </div>
      {list.status === "loading" && <p role="status">Loading AI reviews...</p>}
      {list.status === "error" && (
        <LoadError
          what="AI reviews"
          message={list.message}
          onRetry={() => {
            setList({ status: "loading" });
            setAttempt((n) => n + 1);
          }}
        />
      )}
      {list.status === "ok" && list.rows.length === 0 && (
        <p>{type ? `No ${REPORT_LABEL[type]} reports yet.` : "No AI reviews have been written for the league yet."}</p>
      )}
      {list.status === "ok" && list.rows.length > 0 && (
        <ul className="ai-list" aria-label="AI reviews">
          {list.rows.map((r) => (
            <li key={r.sk}>
              <DrillLink to={reportLink(r)} className="ai-list-link">
                <span className="xp-tag">{REPORT_LABEL[r.report_type] ?? r.report_type}</span>
                <span className="min-w-0 flex-1 font-bold">{periodLabel(r.period)}</span>
                {isRedacted(r) && <span className="xp-tag ai-redacted">Redacted</span>}
                <span className="text-xs">{DATE.format(new Date(r.created_at))}</span>
              </DrillLink>
            </li>
          ))}
        </ul>
      )}
      {list.status === "ok" && list.next && (
        <div className="flex flex-col items-start gap-2">
          <button type="button" className="xp-button" disabled={more.busy} onClick={() => void loadMore()}>
            {more.busy ? "Loading..." : "Load older reports"}
          </button>
          {more.error && <p role="alert">Couldn&rsquo;t load more: {more.error}</p>}
        </div>
      )}
    </div>
  );
}

export function ReportView({ report }: { report: AIReport }) {
  return (
    <article
      className="grid grid-cols-1 gap-3"
      aria-label={`${REPORT_LABEL[report.report_type]}, ${periodLabel(report.period)}`}
    >
      <header className="flex flex-wrap items-center gap-2">
        <span className="xp-tag">{REPORT_LABEL[report.report_type]}</span>
        <h3 className="font-bold">{periodLabel(report.period)}</h3>
        {isRedacted(report) && <span className="xp-tag ai-redacted">Redacted</span>}
        <span className="ml-auto text-xs">Written {DATE.format(new Date(report.created_at))}</span>
      </header>
      <div className="ai-body">
        {report.body_markdown.trim() ? <Markdown text={report.body_markdown} /> : <p>This report has no text.</p>}
      </div>
    </article>
  );
}

export function AIReportWindow({ params }: { params: WindowParams }) {
  const type = String(params.type) as ReportType;
  const period = String(params.period);
  const [load, retry] = useLoad(() => findReport(type, period), `${type}:${period}`);

  if (load.status === "loading") return <p role="status">Loading the report...</p>;
  if (load.status === "error") return <LoadError what="the report" message={load.message} onRetry={retry} />;
  if (!load.value)
    return <p>This report isn&rsquo;t available. It may have been removed or hidden by the commissioner.</p>;
  return <ReportView report={load.value} />;
}

// `ai-report:2026W04:weekly`: a link lists params in key order, period then type.
export function readReportLink(value: string): WindowParams | null {
  const [period, type] = value.split(":");
  return TYPES.includes(type as ReportType) && period ? { type, period } : null;
}

export const reportTitle = (p: WindowParams) => {
  const type = String(p.type) as ReportType;
  return `${REPORT_LABEL[type] ?? "AI Review"} - ${periodLabel(String(p.period))}`;
};

// The report's own first heading and paragraph, without markdown marks.
function headline(r: AIReport): { title: string; excerpt: string } {
  const blocks = r.body_markdown
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);
  const heading = blocks.find((b) => /^#{1,6}\s/.test(b));
  const paragraph = blocks.find((b) => !/^#{1,6}\s/.test(b) && !/^\s*([-*•]|\d+[.)])\s/.test(b)) ?? "";
  const plain = (s: string) =>
    s
      .replace(/^#{1,6}\s+/, "")
      .replace(/\*\*|[*_]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  const excerpt = plain(paragraph);
  return {
    title: heading ? plain(heading.split("\n")[0]) : `${REPORT_LABEL[r.report_type]}, ${periodLabel(r.period)}`,
    excerpt: excerpt.length > 240 ? `${excerpt.slice(0, 240).replace(/\s+\S*$/, "")}...` : excerpt,
  };
}

// Home's card: the newest review that isn't a mock draft. Nothing shows until there is one.
export function AIHeadline() {
  const [load, retry] = useLoad(
    () => listReports().then((p) => p.rows.find((r) => r.report_type !== "mock") ?? null),
    "headline",
  );
  if (load.status === "loading" || (load.status === "ok" && !load.value)) return null;
  return (
    <section className="xp-group" aria-labelledby="home-ai">
      <h3 id="home-ai" className="xp-group-title">
        AI Review
      </h3>
      {load.status === "error" ? (
        <LoadError what="the latest AI review" message={load.message} onRetry={retry} />
      ) : (
        load.value && <HeadlineCard report={load.value} />
      )}
    </section>
  );
}

function HeadlineCard({ report }: { report: AIReport }) {
  const { title, excerpt } = headline(report);
  return (
    <div className="ai-headline">
      <p className="flex flex-wrap items-center gap-2">
        <span className="xp-tag">{REPORT_LABEL[report.report_type]}</span>
        <span className="text-xs">{periodLabel(report.period)}</span>
      </p>
      <p className="ai-headline-title">{title}</p>
      {excerpt && <p className="ai-headline-excerpt">{excerpt}</p>}
      <DrillLink to={reportLink(report)} className="home-more">
        Read the full review
      </DrillLink>
    </div>
  );
}
