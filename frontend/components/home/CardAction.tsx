"use client";

import { type ComponentType, type SVGProps, useContext } from "react";

import type { WindowLink } from "@/lib/desktop/deep-link";
import { DrillContext, NavigateContext } from "@/lib/desktop/navigation";

interface CardActionProps {
  to: WindowLink;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  children: string;
}

// A card's one thing to do, as a button rather than the header's text link.
export function CardAction({ to, Icon, children }: CardActionProps) {
  const drill = useContext(DrillContext);
  const navigate = useContext(NavigateContext);
  return (
    <button type="button" className="xp-button home-card-action" onClick={() => (navigate ?? drill)(to)}>
      <Icon width={20} height={20} className="flex-none" aria-hidden />
      {children}
    </button>
  );
}
