"use client";

import { LoadError } from "@/components/xp/LoadError";
import { TeamName } from "@/components/xp/TeamName";
import { BracketIcon, CrownIcon, TrophyIcon } from "@/components/xp/icons";
import { Window } from "@/components/xp/Window";
import { refreshOverview, useOverview, type Overview } from "@/lib/landing/overview";

// Public Sleeper data only, so it loads signed out. The rest of the landing is
// static and renders whether or not Sleeper answers.
export function LeagueLive() {
  const state = useOverview();

  if (state.status === "error") {
    return (
      <div className="landing-desk-grid">
        <Window title="League Status" icon={<CrownIcon width={16} height={16} />} controls>
          <LoadError what="the league from Sleeper" message={state.message} onRetry={refreshOverview} />
        </Window>
      </div>
    );
  }

  const o = state.status === "ok" ? state.overview : null;
  return (
    <div className="landing-desk-grid">
      <div className="landing-desk-col">
        <Window title="League Status" icon={<CrownIcon width={16} height={16} />} controls>
          {o ? <Status overview={o} /> : <Skeleton label="Loading league status" rows={4} />}
        </Window>
        <Window title="Hall of Champions" icon={<TrophyIcon width={16} height={16} />} controls>
          {o ? <Champions overview={o} /> : <Skeleton label="Loading champions" rows={3} />}
        </Window>
      </div>
      <Window title="Playoff Picture" icon={<BracketIcon width={16} height={16} />} controls>
        {o ? <Seeds overview={o} /> : <Skeleton label="Loading standings" rows={6} />}
      </Window>
    </div>
  );
}

function Status({ overview: o }: { overview: Overview }) {
  const reigning = o.champions[0];
  return (
    <div aria-live="polite">
      <p className="flex items-center gap-2 text-base font-bold">
        {o.live && <span className="landing-live-dot shrink-0" aria-hidden />}
        {o.phase}
      </p>
      <p className="text-xs">CLT Dynasty League, {o.season} season</p>
      <dl className="xp-summary landing-status-list mt-3">
        {reigning && (
          <>
            <dt>Reigning champ</dt>
            <dd>
              {reigning.champion.name} ({reigning.season})
            </dd>
          </>
        )}
        {o.seeds && (
          <>
            <dt>Top seed</dt>
            <dd>
              {o.seeds[0].team.name} ({o.seeds[0].record})
            </dd>
          </>
        )}
        {o.draft && (
          <>
            <dt>{o.draft.label}</dt>
            <dd>{o.draft.detail}</dd>
          </>
        )}
      </dl>
    </div>
  );
}

function Champions({ overview: o }: { overview: Overview }) {
  if (o.champions.length === 0) return <p>No season has finished yet. The first banner is still up for grabs.</p>;
  return (
    <ol className="landing-champions" aria-label="Champions by season">
      {o.champions.map((c) => (
        <li key={c.season}>
          <span className="landing-champion-year">{c.season}</span>
          <span className="min-w-0">
            <TeamName name={c.champion.name} avatarUrl={c.champion.avatarUrl} />
            {c.runnerUp && <span className="block text-xs">Beat {c.runnerUp.name} in the final</span>}
          </span>
        </li>
      ))}
    </ol>
  );
}

function Seeds({ overview: o }: { overview: Overview }) {
  if (!o.seeds) return <p>The playoff picture fills in once week 1 is played.</p>;
  return (
    <>
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
          {o.seeds.map((s) => (
            <tr key={s.seed}>
              <td className="font-bold">{s.seed}</td>
              <td className="max-w-0 [&_.xp-team]:max-w-full">
                <TeamName name={s.team.name} avatarUrl={s.team.avatarUrl} />
              </td>
              <td className="max-sm:hidden">{s.division}</td>
              <td className="tabular-nums">{s.record}</td>
              <td className="text-right tabular-nums">{s.pf.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function Skeleton({ label, rows }: { label: string; rows: number }) {
  return (
    <div role="status" aria-label={label} className="landing-skeleton">
      {Array.from({ length: rows }, (_, i) => (
        <span key={i} style={{ width: `${90 - ((i * 17) % 40)}%` }} />
      ))}
    </div>
  );
}
