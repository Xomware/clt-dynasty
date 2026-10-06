"use client";

import type { ComponentType, MouseEvent, Ref, SVGProps } from "react";

import { TeamAvatar } from "@/components/xp/TeamAvatar";
import type { WindowLink } from "@/lib/desktop/deep-link";
import type { Team } from "@/lib/league/use-league";
import { LINE, LineIcon } from "./icons";
import { HOME, urlOf } from "./pages";

interface Crumb {
  label: string;
  to: WindowLink;
}

interface PageHeaderProps {
  title: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  // The page's group, linked to its first page; none for a page outside the groups.
  group: Crumb | null;
  headingRef?: Ref<HTMLHeadingElement>;
  // A team page wears the team's picture instead of the window icon.
  team?: Team | null;
  onNav: (e: MouseEvent, to: WindowLink) => void;
}

// Every page's head: where it sits (Home, its group), its icon and its title.
export function PageHeader({ title, Icon, group, headingRef, team, onNav }: PageHeaderProps) {
  const crumbs: Crumb[] = [{ label: "Home", to: HOME }, ...(group ? [group] : [])];
  return (
    <header className="u-page-head">
      {team ? (
        <TeamAvatar name={team.name} url={team.avatarUrl} size={72} className="u-medal u-medal-team" />
      ) : (
        <span className="u-medal" aria-hidden>
          <Icon width={40} height={40} />
        </span>
      )}
      <div className="min-w-0">
        <nav aria-label="Breadcrumb" className="u-crumbs">
          <ol>
            {crumbs.map((c) => (
              <li key={c.label}>
                <a href={urlOf(c.to)} onClick={(e) => onNav(e, c.to)}>
                  {c.label}
                </a>
                <LineIcon d={LINE.chevron} size={14} />
              </li>
            ))}
            <li aria-current="page">{title}</li>
          </ol>
        </nav>
        <h1 ref={headingRef} tabIndex={-1} className="u-title">
          {title}
        </h1>
      </div>
    </header>
  );
}
