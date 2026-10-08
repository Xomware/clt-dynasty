import type { ComponentType, SVGProps } from "react";

import { TeamAvatar } from "@/components/xp/TeamAvatar";
import type { Team } from "@/lib/league/use-league";

interface PageHeadProps {
  title: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  // A team page wears the team's picture instead of the window icon.
  team?: Team | null;
}

// A page's head: a sticker with its icon and the title in jersey lettering.
// The path to the page is on the bar above it.
export function PageHead({ title, Icon, team }: PageHeadProps) {
  return (
    <header className="bz-page-head">
      {team ? (
        <TeamAvatar name={team.name} url={team.avatarUrl} size={80} className="bz-medal bz-medal-team" />
      ) : (
        <span className="bz-medal" aria-hidden>
          <Icon width={40} height={40} />
        </span>
      )}
      <h1 tabIndex={-1} className="bz-title min-w-0">
        {title}
      </h1>
    </header>
  );
}
