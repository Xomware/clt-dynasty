import type { ReactNode } from "react";

import { playerLink } from "@/lib/player/links";
import { DrillLink } from "./DrillLink";

interface PlayerLinkProps {
  id: string;
  children: ReactNode;
  className?: string;
}

// A player's name that opens his Player window.
export function PlayerLink({ id, children, className }: PlayerLinkProps) {
  return (
    <DrillLink to={playerLink(id)} className={className}>
      {children}
    </DrillLink>
  );
}
