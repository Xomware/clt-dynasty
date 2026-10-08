import { request } from "./client";

export type ReportType = "postDraft" | "preseason" | "weekly" | "weekPreview" | "mock";

// A row of xomper-ai-reports as /ai-reports/* return it (ai_reports_store).
// Dynamo hands back booleans in metadata as "true"/"false" strings.
export interface AIReport {
  pk: string;
  sk: string;
  league_id: string;
  report_type: ReportType;
  period: string;
  body_markdown: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export const REPORT_LABEL: Record<ReportType, string> = {
  postDraft: "Post-Draft",
  preseason: "Preseason",
  weekly: "Weekly Recap",
  weekPreview: "Week Preview",
  mock: "Mock Draft",
};

// Weekly periods read "2026W04"; the rest are already a season like "2026-PRESEASON".
export function periodLabel(period: string): string {
  const week = /^(\d{4})W(\d{1,2})$/.exec(period);
  if (week) return `Week ${Number(week[2])}, ${week[1]}`;
  return period.replace(/-PRESEASON$/, " preseason");
}

// Null until the league has one of that type; also null for a redacted one, unless the caller is an admin.
export const getLatestReport = (type: ReportType) =>
  request<{ report: AIReport | null }>(`/ai-reports/latest?type=${type}`).then((r) => r.report);

// The 2024-2025 reports were backfilled in one batch and share a created_at to
// the second, so the API's order among them is arbitrary; the period breaks the tie.
// Only weekly recaps order by period; the sort is stable, so other ties keep the API's order.
const newestFirst = (a: AIReport, b: AIReport) =>
  b.created_at.localeCompare(a.created_at) ||
  (a.report_type === "weekly" && b.report_type === "weekly" ? b.period.localeCompare(a.period) : 0);

export interface ReportPage {
  rows: AIReport[];
  next_cursor: string | null;
}

// Newest first. `cursor` is the opaque next_cursor from the previous page;
// the API pages 20 by default, 50 at most.
export function listReports(type?: ReportType, cursor?: string | null, limit?: number): Promise<ReportPage> {
  const qs = new URLSearchParams();
  if (type) qs.set("type", type);
  if (cursor) qs.set("cursor", cursor);
  if (limit) qs.set("limit", String(limit));
  const query = qs.toString();
  return request<ReportPage>(`/ai-reports/list${query ? `?${query}` : ""}`).then((page) => ({
    ...page,
    rows: [...page.rows].sort(newestFirst),
  }));
}

// No route reads one report by period, so walk that type's pages, as the iOS app does.
export async function findReport(type: ReportType, period: string): Promise<AIReport | null> {
  let cursor: string | null = null;
  for (let page = 0; page < 5; page++) {
    const { rows, next_cursor }: ReportPage = await listReports(type, cursor);
    const hit = rows.find((r) => r.period === period);
    if (hit) return hit;
    if (!next_cursor) return null;
    cursor = next_cursor;
  }
  return null;
}
