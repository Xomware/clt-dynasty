"use client";

import Image from "next/image";
import { useContext } from "react";

import { DrillLink } from "@/components/xp/DrillLink";
import { LoadError } from "@/components/xp/LoadError";
import { TeamName } from "@/components/xp/TeamName";
import { LEAGUE_ID } from "@/lib/config";
import { DrillContext } from "@/lib/desktop/navigation";
import type { WindowParams } from "@/lib/desktop/windows";
import { account as getAccount, nflState, userLeagues } from "@/lib/league/cache";
import { teamOf } from "@/lib/league/use-league";
import { rosterOf } from "@/lib/sleeper/rosters";
import { loadLeagueData, useMySleeperId } from "@/lib/team/data";
import { leagueLink, teamLink } from "@/lib/team/links";
import { avatarUrl, ordinal, rankOf } from "@/lib/team/team";
import { useLoad } from "@/lib/use-load";

import "./team.css";

async function loadProfile(userId: string) {
  const account = await getAccount(userId);
  if (!account) return null;
  const nfl = await nflState();
  const season = nfl.league_season ?? nfl.season;
  const [leagues, clt] = await Promise.all([userLeagues(account.user_id, season), loadLeagueData(LEAGUE_ID)]);
  return { account, season, leagues, clt };
}

export function ProfileWindow({ params }: { params: WindowParams }) {
  const me = useMySleeperId();
  const open = useContext(DrillContext);
  const userId = params.userId ? String(params.userId) : me;

  if (!userId) {
    return (
      <div className="team-empty">
        <p>Link your Sleeper account in Settings to see your profile.</p>
        <button type="button" className="xp-button" onClick={() => open({ kind: "settings", params: {} })}>
          Open Settings
        </button>
      </div>
    );
  }
  return <Profile userId={userId} />;
}

function Profile({ userId }: { userId: string }) {
  const [load, retry] = useLoad(() => loadProfile(userId), userId);

  if (load.status === "loading") return <p role="status">Loading the profile...</p>;
  if (load.status === "error") return <LoadError what="the profile from Sleeper" message={load.message} onRetry={retry} />;
  if (!load.value) return <p role="alert">Sleeper has no user {userId}.</p>;

  const { account, season, leagues, clt } = load.value;
  const avatar = avatarUrl(account.avatar);
  const rosterId = rosterOf(clt.rosters, account.user_id);
  const roster = clt.rosters.find((r) => r.roster_id === rosterId);
  const others = leagues.filter((l) => l.league_id !== LEAGUE_ID);
  const rank = roster && rankOf(clt.rosters, roster.roster_id);

  return (
    <div className="flex flex-col gap-3">
      <section aria-label={account.display_name} className="team-head">
        <span className="team-avatar" aria-hidden>
          {avatar ? (
            <Image src={avatar} alt="" width={56} height={56} unoptimized className="size-full object-cover" />
          ) : (
            account.display_name.charAt(0).toUpperCase()
          )}
        </span>
        <div className="team-who">
          <h3 className="team-name">
            <span className="truncate">{account.display_name}</span>
          </h3>
          {account.username !== account.display_name.toLowerCase() && <p className="truncate">@{account.username}</p>}
        </div>
      </section>

      <section className="xp-group" aria-labelledby="profile-clt">
        <h3 id="profile-clt" className="xp-group-title">
          {clt.league.name}
        </h3>
        {roster ? (
          <div className="team-list-row">
            <DrillLink to={teamLink(LEAGUE_ID, roster.roster_id)}>
              <TeamName name={teamOf(clt.users, roster, roster.roster_id).name} avatarUrl={avatarUrl(account.avatar)} />
            </DrillLink>
            <span className="ml-auto flex-none text-xs tabular-nums">
              {roster.settings.wins}-{roster.settings.losses}
              {rank && ` · ${ordinal(rank.league)} of ${rank.of}`}
            </span>
          </div>
        ) : (
          <p>Doesn&rsquo;t manage a team in this league.</p>
        )}
      </section>

      <section className="xp-group" aria-labelledby="profile-leagues">
        <h3 id="profile-leagues" className="xp-group-title">
          Other {season} leagues
        </h3>
        {others.length === 0 ? (
          <p>No other Sleeper leagues this season.</p>
        ) : (
          <ul className="team-list">
            {others.map((l) => (
              <li key={l.league_id} className="team-list-row">
                <DrillLink to={leagueLink(l.league_id)}>
                  <TeamName name={l.name} avatarUrl={avatarUrl(l.avatar)} />
                </DrillLink>
                <span className="ml-auto flex-none text-xs">{l.total_rosters} teams</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
