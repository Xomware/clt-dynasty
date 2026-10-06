import type { AIReport } from "./ai-reports";
import { request } from "./client";

export type Trigger = "postdraft" | "preseason" | "weekly" | "week-preview";

export interface TriggerOptions {
  dry_run: boolean;
  force: boolean;
  // Weekly and week-preview only; omitted means the current (or upcoming) week.
  week?: number;
}

// The rendered email one member would get; dry runs only.
export interface EmailPreview {
  recipient_user_id: string;
  recipient_email: string;
  display_name: string;
  subject: string;
  text_body: string;
  html_body_excerpt: string;
}

// The union of the four handlers' 200 bodies: post-draft, preseason and weekly
// share one envelope, week-preview returns its orchestrator's dict.
export interface TriggerResult {
  Success: true;
  status: string;
  period?: string;
  week?: number;
  dry_run: boolean;
  report?: AIReport | null;
  delivery_count?: number;
  email_sent?: number;
  email_failed?: number;
  model?: string;
  token_usage?: Record<string, number>;
  previews?: EmailPreview[] | null;
}

// 409 when that period already has a report and force is off; 412 when its window hasn't opened or has passed.
export const runTrigger = (trigger: Trigger, options: TriggerOptions) =>
  request<TriggerResult>(`/admin/ai-review-${trigger}-trigger`, { method: "POST", body: JSON.stringify(options) });

export type ReportFlag = "is_redacted" | "do_not_broadcast";

export const flagReport = (report: AIReport, flag: ReportFlag, value: boolean) =>
  request<{ metadata: Record<string, unknown> }>("/admin/reports-flag", {
    method: "POST",
    body: JSON.stringify({
      league_id: report.league_id,
      report_type: report.report_type,
      period: report.period,
      flag,
      value,
    }),
  }).then((r) => r.metadata);
