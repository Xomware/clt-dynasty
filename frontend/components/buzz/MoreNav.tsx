"use client";

import type { WindowLink } from "@/lib/desktop/deep-link";
import { useLauncherGroups } from "@/lib/desktop/registry";

interface MoreNavProps {
  current: WindowLink | undefined;
  onGo: (to: WindowLink) => void;
}

// The tab bar's More: every group's pages as tiles, in the nav's group order.
export function MoreNav({ current, onGo }: MoreNavProps) {
  const { groups } = useLauncherGroups();
  return (
    <nav aria-label="Pages" className="u-more">
      {groups.map((g) => (
        <section key={g.id} aria-labelledby={`more-${g.id}`}>
          <h3 id={`more-${g.id}`} className="u-sheet-label">
            {g.label}
          </h3>
          <ul className="u-more-grid">
            {g.items.map(({ kind, label, Icon }) => (
              <li key={kind}>
                <button
                  type="button"
                  className="u-more-tile"
                  aria-current={current?.kind === kind ? "page" : undefined}
                  onClick={() => onGo({ kind, params: {} })}
                >
                  <Icon width={28} height={28} aria-hidden className="flex-none" />
                  <span className="min-w-0">{label}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </nav>
  );
}
