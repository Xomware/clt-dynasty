import { type AIReport, listReports } from "@/lib/api/ai-reports";

// "2026W04" -> season 2026, week 4.
export function recapWeek(period: string): { season: string; week: number } | null {
  const m = /^(\d{4})W(\d{1,2})$/.exec(period);
  return m ? { season: m[1], week: Number(m[2]) } : null;
}

const order = (r: AIReport) => {
  const w = recapWeek(r.period);
  return w ? Number(w.season) * 100 + w.week : 0;
};

// Every weekly recap, the latest week first. One page of 50 covers two backfilled
// seasons plus this one; ordered by week, not by when the row was written.
export const weeklyRecaps = () =>
  listReports("weekly", null, 50).then((page) => [...page.rows].sort((a, b) => order(b) - order(a)));

const plain = (s: string) => s.replace(/\*\*|[*_]/g, "").replace(/\s+/g, " ").trim();

// A recap opens "# Week 4 Recap — 2026", then "## <its own headline>", then a
// lede paragraph. The headline is the second heading; older ones may only have one.
export function recapParts(r: AIReport): { title: string; lede: string } {
  const blocks = r.body_markdown
    .replace(/\r\n/g, "\n")
    .replace(/^(#{1,6} .*)\n(?!\n)/gm, "$1\n\n")
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);
  const headings = blocks.filter((b) => /^#{1,6}\s/.test(b)).map((b) => plain(b.replace(/^#{1,6}\s+/, "")));
  const lede = blocks.find((b) => !/^#{1,6}\s/.test(b) && !/^\*\*/.test(b) && !/^\s*([-*•]|\d+[.)])\s/.test(b)) ?? "";
  const w = recapWeek(r.period);
  const fallback = w ? `Week ${w.week} recap, ${w.season}` : "Weekly recap";
  return {
    title: headings.length > 1 ? headings[1] : (headings[0] ?? fallback),
    lede: plain(lede),
  };
}

interface Blurb {
  matchup_id?: number | string;
  team_a?: string;
  team_b?: string;
  blurb?: string;
}

// The recap's line on one game, from the per-matchup blurbs the weekly job
// stamps into metadata. Matched by Sleeper matchup id, else by team name.
export function matchupBlurb(r: AIReport, matchupId: number | null, teamName: string | null): string | null {
  const rows = Array.isArray(r.metadata.matchups) ? (r.metadata.matchups as Blurb[]) : [];
  const hit =
    (matchupId !== null ? rows.find((m) => Number(m.matchup_id) === matchupId) : undefined) ??
    (teamName ? rows.find((m) => m.team_a?.trim() === teamName.trim() || m.team_b?.trim() === teamName.trim()) : undefined);
  return hit?.blurb?.trim() || null;
}
