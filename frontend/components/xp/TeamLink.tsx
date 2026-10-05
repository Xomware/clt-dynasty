import { LEAGUE_ID } from "@/lib/config";
import { teamLink } from "@/lib/team/links";
import { DrillLink } from "./DrillLink";
import { TeamName } from "./TeamName";

interface TeamLinkProps {
  rosterId: number;
  name: string;
  avatarUrl?: string | null;
  isMine?: boolean;
  // A past season's league; CLT's current league otherwise.
  leagueId?: string;
}

// A team's name that opens its Team Profile.
export function TeamLink({ rosterId, leagueId = LEAGUE_ID, ...team }: TeamLinkProps) {
  return (
    <DrillLink to={teamLink(leagueId, rosterId)}>
      <TeamName {...team} />
    </DrillLink>
  );
}
