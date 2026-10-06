import Image from "next/image";

import { nflLogo, nflTeam, nflTeamName } from "@/lib/nfl/teams";
import { nflLink } from "@/lib/player/links";
import { DrillLink } from "./DrillLink";

import "./players.css";

interface NflTeamLinkProps {
  team: string | null | undefined;
  // The full name ("Los Angeles Chargers") rather than the code.
  long?: boolean;
  className?: string;
}

// An NFL team's logo and code that open its depth chart. No team is a free agent.
export function NflTeamLink({ team, long = false, className = "" }: NflTeamLinkProps) {
  const t = nflTeam(team ?? undefined);
  if (!t) return <span className={className}>FA</span>;
  return (
    <DrillLink to={nflLink(t.abbr)} className={`xp-nfl ${className}`}>
      <Image src={nflLogo(t.abbr)} alt="" width={16} height={16} unoptimized className="xp-nfl-logo" />
      <span>{long ? nflTeamName(t) : t.abbr}</span>
      {!long && <span className="sr-only">, {nflTeamName(t)}</span>}
    </DrillLink>
  );
}
