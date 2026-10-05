"use client";

import Image from "next/image";

import { DrillLink } from "@/components/xp/DrillLink";
import { LoadError } from "@/components/xp/LoadError";
import { TeamName } from "@/components/xp/TeamName";
import { LEAGUE_ID } from "@/lib/config";
import type { WindowParams } from "@/lib/desktop/windows";
import { avatarUrl } from "@/lib/sleeper/league";
import { loadLeagueData, useMySleeperId } from "@/lib/team/data";
import { teamLink } from "@/lib/team/links";
import { divisionName, ownerOf, pointsFor, rosterOwnedBy, sortByRecord, teamName } from "@/lib/team/team";
import { useLoad } from "@/lib/use-load";

import "./team.css";

const STATUS: Record<string, string> = { pre_draft: "Pre-draft", drafting: "Drafting", in_season: "In season", complete: "Complete" };

export function LeagueWindow({ params }: { params: WindowParams }) {
  const leagueId = String(params.leagueId);
  const [load, retry] = useLoad(() => loadLeagueData(leagueId), leagueId);
  const me = useMySleeperId();

  if (load.status === "loading") return <p role="status">Loading the league...</p>;
  if (load.status === "error") return <LoadError what="the league from Sleeper" message={load.message} onRetry={retry} />;
  const { league, users, rosters } = load.value;
  const avatar = avatarUrl(league.avatar);
  const mine = leagueId === LEAGUE_ID && me ? rosterOwnedBy(rosters, me) : undefined;
  const divisions = (league.settings.divisions ?? 0) > 1;

  return (
    <div className="flex flex-col gap-3">
      <section aria-label={league.name} className="team-head">
        <span className="team-avatar" aria-hidden>
          {avatar ? <Image src={avatar} alt="" width={56} height={56} unoptimized className="size-full object-cover" /> : league.name.charAt(0).toUpperCase()}
        </span>
        <div className="team-who">
          <h3 className="team-name">
            <span className="truncate">{league.name}</span>
          </h3>
          <p>
            {league.season} season · {league.total_rosters} teams · {STATUS[league.status] ?? league.status}
          </p>
        </div>
      </section>
      {rosters.length === 0 ? (
        <p>This league has no teams yet.</p>
      ) : (
        <div className="xp-table-scroll">
          <table className="xp-table team-league-table">
            <caption className="sr-only">Standings by record, then points for</caption>
            <thead>
              <tr>
                <th scope="col" className="w-10 text-right">#</th>
                <th scope="col">Team</th>
                {divisions && <th scope="col" className="team-division w-24">Division</th>}
                <th scope="col" className="w-16 text-right">W-L</th>
                <th scope="col" className="w-20 text-right">PF</th>
              </tr>
            </thead>
            <tbody>
              {sortByRecord(rosters).map((r, i) => {
                const { wins, losses, ties } = r.settings;
                return (
                  <tr key={r.roster_id}>
                    <td className="text-right tabular-nums">{i + 1}</td>
                    <td className="min-w-0">
                      <DrillLink to={teamLink(leagueId, r.roster_id)}>
                        <TeamName
                          name={teamName(r, users, r.roster_id)}
                          avatarUrl={avatarUrl(ownerOf(r, users)?.avatar)}
                          isMine={r === mine}
                        />
                      </DrillLink>
                    </td>
                    {divisions && <td className="team-division truncate">{divisionName(league, r.settings.division)}</td>}
                    <td className="text-right tabular-nums">
                      {wins}-{losses}
                      {ties > 0 && `-${ties}`}
                    </td>
                    <td className="text-right tabular-nums">{pointsFor(r).toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
