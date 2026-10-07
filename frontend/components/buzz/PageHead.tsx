"use client";

import type { ComponentType, MouseEvent, Ref, SVGProps } from "react";

import { HOME, urlOf } from "@/components/uptown/pages";
import { TeamAvatar } from "@/components/xp/TeamAvatar";
import type { WindowLink } from "@/lib/desktop/deep-link";
import type { Team } from "@/lib/league/use-league";

interface Crumb {
  label: string;
  to: WindowLink;
}

interface PageHeadProps {
  title: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  // The page's group, linked to its first page; none for a page outside the groups.
  group: Crumb | null;
  headingRef?: Ref<HTMLHeadingElement>;
  // A team page wears the team's picture instead of the window icon.
  team?: Team | null;
  onNav: (e: MouseEvent, to: WindowLink) => void;
}

// A page's head: a sticker with its icon, the trail on a strip of tape, and
// the title in jersey lettering.
export function PageHead({ title, Icon, group, headingRef, team, onNav }: PageHeadProps) {
  const crumbs: Crumb[] = [{ label: "Home", to: HOME }, ...(group ? [group] : [])];
  return (
    <header className="bz-page-head">
      {team ? (
        <TeamAvatar name={team.name} url={team.avatarUrl} size={80} className="bz-medal bz-medal-team" />
      ) : (
        <span className="bz-medal" aria-hidden>
          <Icon width={40} height={40} />
        </span>
      )}
      <div className="min-w-0">
        <nav aria-label="Breadcrumb" className="bz-crumbs">
          <ol>
            {crumbs.map((c) => (
              <li key={c.label}>
                <a href={urlOf(c.to)} onClick={(e) => onNav(e, c.to)}>
                  {c.label}
                </a>
              </li>
            ))}
            <li aria-current="page">{title}</li>
          </ol>
        </nav>
        <h1 ref={headingRef} tabIndex={-1} className="bz-title">
          {title}
        </h1>
      </div>
    </header>
  );
}
