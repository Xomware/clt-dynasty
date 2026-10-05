import type { SleeperDraft } from "@/lib/sleeper/types";

// The next draft Sleeper has for the league, if one is waiting or under way.
export const upcomingDraft = (drafts: SleeperDraft[]) => drafts.find((d) => d.status === "pre_draft" || d.status === "drafting" || d.status === "paused");

export function countdown(ms: number): string {
  const s = Math.floor(ms / 1000);
  const [d, h, m, sec] = [Math.floor(s / 86400), Math.floor((s % 86400) / 3600), Math.floor((s % 3600) / 60), s % 60];
  const pad = (n: number) => String(n).padStart(2, "0");
  if (d > 0) return `${d}d ${pad(h)}h ${pad(m)}m ${pad(sec)}s`;
  if (h > 0) return `${h}h ${pad(m)}m ${pad(sec)}s`;
  return `${m}m ${pad(sec)}s`;
}
