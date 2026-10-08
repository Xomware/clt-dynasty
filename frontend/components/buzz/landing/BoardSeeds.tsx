import type { CSSProperties } from "react";

import { Flip } from "@/components/buzz/Flip";
import { TeamName } from "@/components/xp/TeamName";
import type { Overview } from "@/lib/landing/overview";

// The playoff picture on the arena board: a marquee running the seeds across
// the top, and the table's numbers on split-flap tiles that flip in when the
// board scrolls into view.
export function BoardSeeds({ overview: o }: { overview: Overview }) {
  if (!o.seeds) return <p>The playoff picture fills in once week 1 is played.</p>;
  const run = ["If the season ended today", ...o.seeds.map((s) => `${s.seed}. ${s.team.name} ${s.record}`)];
  return (
    <>
      <div className="bz-marquee" aria-hidden style={{ "--n": run.length } as CSSProperties}>
        <div className="bz-marquee-run">
          {[0, 1].map((copy) => (
            <p key={copy}>
              {run.map((t) => (
                <span key={t}>{t}</span>
              ))}
            </p>
          ))}
        </div>
      </div>
      <p className="mb-2 text-xs">If the season ended today. Division winners take seeds 1 to 3.</p>
      <table className="xp-table">
        <caption className="sr-only">Playoff seeds as of today</caption>
        <thead>
          <tr>
            <th scope="col" className="w-10">
              Seed
            </th>
            <th scope="col">Team</th>
            <th scope="col" className="w-16 max-sm:hidden">
              Div
            </th>
            <th scope="col" className="w-14">
              W-L
            </th>
            <th scope="col" className="w-16 text-right">
              PF
            </th>
          </tr>
        </thead>
        <tbody>
          {o.seeds.map((s, row) => (
            <tr key={s.seed}>
              <td>
                <Flip text={String(s.seed)} at={row * 2} />
              </td>
              <td className="max-w-0 [&_.xp-team]:max-w-full">
                <TeamName name={s.team.name} avatarUrl={s.team.avatarUrl} />
              </td>
              <td className="max-sm:hidden">{s.division}</td>
              <td className="tabular-nums">
                <Flip text={s.record} at={row * 2 + 1} />
              </td>
              <td className="text-right tabular-nums">
                <Flip text={s.pf.toFixed(1)} at={row * 2 + 2} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
