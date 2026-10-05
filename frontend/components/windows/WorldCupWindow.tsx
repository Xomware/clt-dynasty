"use client";

import { LoadError } from "@/components/xp/LoadError";
import { TeamName } from "@/components/xp/TeamName";
import { getWorldCup, type WorldCupDivision, type WorldCupTeam } from "@/lib/api/clt";
import { useLeague } from "@/lib/league/use-league";
import { useMember } from "@/lib/member/use-member";
import { useLoad } from "@/lib/use-load";

import "./league.css";

const STATUS: Record<WorldCupTeam["status"], string> = { clinched: "Clinched", alive: "Alive", eliminated: "Out" };

interface DivisionProps {
  division: WorldCupDivision;
  avatarOf: (userId: string) => string | null;
  mine: string;
}

function Division({ division, avatarOf, mine }: DivisionProps) {
  const left = division.gamesRemaining;
  const headingId = `world-cup-${division.division}`;
  return (
    <section aria-labelledby={headingId}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <h3 id={headingId} className="xp-group-title">
          {division.name}
        </h3>
        <p className="text-xs">{left > 0 ? `${left} divisional ${left === 1 ? "game" : "games"} left` : "Divisional games done"}</p>
      </div>
      <div className="xp-table-scroll">
        <table className="xp-table">
          <caption className="sr-only">{division.name} World Cup standings</caption>
          <thead>
            <tr>
              <th scope="col" className="w-10">
                #
              </th>
              {/* On a phone the team column takes what is left and truncates, so Status stays on screen. */}
              <th scope="col" className="max-md:w-full">
                Team
              </th>
              <th scope="col" className="w-16">
                W-L
              </th>
              <th scope="col" className="standings-extra w-20 text-right">
                PF
              </th>
              <th scope="col" className="standings-extra w-20 text-right">
                PA
              </th>
              <th scope="col" className="w-24 text-right">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {division.teams.map((t, i) => (
              <tr key={t.userId} className={i < 2 ? "xp-in" : undefined}>
                <td className="tabular-nums">{i + 1}</td>
                <td className="max-w-0 [&_.xp-team]:max-w-full">
                  <TeamName name={t.teamName || t.username} avatarUrl={avatarOf(t.userId)} isMine={t.userId === mine} />
                </td>
                <td className="tabular-nums">
                  {t.wins}-{t.losses}
                  {t.ties > 0 && `-${t.ties}`}
                </td>
                <td className="standings-extra text-right tabular-nums">{t.pointsFor.toFixed(2)}</td>
                <td className="standings-extra text-right tabular-nums">{t.pointsAgainst.toFixed(2)}</td>
                <td className="text-right">
                  <span className="xp-tag world-cup-status" data-status={t.status}>
                    {STATUS[t.status]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function WorldCupWindow() {
  const [load, retry] = useLoad(getWorldCup, "world-cup");
  const { data } = useLeague();
  const member = useMember().state;
  const mine = member.status === "member" ? member.me.linkedSleeperUserId || member.me.member.sleeperUserId : "";

  if (load.status === "loading") return <p role="status">Loading World Cup standings...</p>;
  if (load.status === "error") return <LoadError what="World Cup standings" message={load.message} onRetry={retry} />;

  const { season, divisions } = load.value;
  if (divisions.length === 0) return <p>No divisional games have been played yet.</p>;

  // The current league's users, for avatars; a manager who has left shows an initial.
  const avatarOf = (userId: string) => {
    const avatar = data?.users.find((u) => u.user_id === userId)?.avatar;
    return avatar ? `https://sleepercdn.com/avatars/thumbs/${avatar}` : null;
  };

  return (
    <div className="grid grid-cols-1 gap-3">
      <p>
        {season} qualifying. Every divisional game since the league began counts, and the top two in each division go to
        the World Cup.
      </p>
      {divisions.map((d) => (
        <Division key={d.division} division={d} avatarOf={avatarOf} mine={mine} />
      ))}
    </div>
  );
}
