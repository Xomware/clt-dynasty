"use client";

import { useRef, useState } from "react";

import { HomeCard } from "@/components/home/HomeCard";
import { headline, reportLink } from "@/components/windows/AIReviewWindow";
import { DrillLink } from "@/components/xp/DrillLink";
import { LoadError } from "@/components/xp/LoadError";
import { listReports, periodLabel, REPORT_LABEL } from "@/lib/api/ai-reports";
import { useLoad } from "@/lib/use-load";
import { LINE, LineIcon } from "../line-icons";

// The AI's recaps and previews, newest first, as a row of cards to swipe or step through.
export function Recaps() {
  const [load, retry] = useLoad(() => listReports().then((p) => p.rows.filter((r) => r.report_type !== "mock").slice(0, 10)), "recaps");
  const row = useRef<HTMLOListElement>(null);
  const [edge, setEdge] = useState({ start: true, end: false });
  const onScroll = () => {
    const el = row.current;
    if (!el) return;
    setEdge({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth > el.scrollWidth - 8 });
  };
  const step = (dir: 1 | -1) => row.current?.scrollBy({ left: dir * row.current.clientWidth * 0.85, behavior: "smooth" });
  const rows = load.status === "ok" ? load.value : [];

  return (
    <HomeCard title="League recaps" more={{ to: { kind: "ai-review", params: {} }, label: "All recaps" }} className="u-recaps">
      {load.status === "loading" && <p role="status">Loading the recaps...</p>}
      {load.status === "error" && <LoadError what="the recaps" message={load.message} onRetry={retry} />}
      {load.status === "ok" && rows.length === 0 && <p>No recaps yet. The AI writes one after every week.</p>}
      {rows.length > 0 && (
        <div className="u-recaps-body">
          <ol ref={row} className="u-recaps-row" aria-label="Recaps, newest first" onScroll={onScroll}>
            {rows.map((r) => {
              const { title, excerpt } = headline(r);
              return (
                <li key={`${r.report_type}:${r.period}`} className="u-recap">
                  <p className="u-recap-meta">
                    <span className="xp-tag">{REPORT_LABEL[r.report_type]}</span>
                    {periodLabel(r.period)}
                  </p>
                  <p className="u-recap-title">{title}</p>
                  {excerpt && <p className="u-recap-excerpt">{excerpt}</p>}
                  <DrillLink to={reportLink(r)} className="u-recap-read">
                    Read it
                  </DrillLink>
                </li>
              );
            })}
          </ol>
          {rows.length > 1 && (
            <div className="u-recaps-steps">
              <button type="button" className="u-step" aria-label="Newer recaps" disabled={edge.start} onClick={() => step(-1)}>
                <LineIcon d={LINE.back} size={18} />
              </button>
              <button type="button" className="u-step" aria-label="Earlier recaps" disabled={edge.end} onClick={() => step(1)}>
                <LineIcon d={LINE.chevron} size={18} />
              </button>
            </div>
          )}
        </div>
      )}
    </HomeCard>
  );
}
