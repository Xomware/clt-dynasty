"use client";

import { useContext, useId } from "react";

import { DrillContext } from "@/lib/desktop/navigation";
import { useLauncherGroups } from "@/lib/desktop/registry";
import type { WindowParams } from "@/lib/desktop/windows";
import { LINE, LineIcon } from "./line-icons";
import { ABOUT } from "./pages";

// Buzz City's take on a folder: each of the group's pages as a card with its one-liner.
export function GroupPage({ params }: { params: WindowParams }) {
  const open = useContext(DrillContext);
  const id = useId();
  const items = useLauncherGroups().groups.find((g) => g.id === params.id)?.items ?? [];

  if (items.length === 0) return <p className="u-quiet">Nothing in this group for you yet.</p>;
  return (
    <ul className="u-group-cards">
      {items.map((l) => (
        <li key={l.kind}>
          <button
            type="button"
            className="u-group-card"
            aria-labelledby={`${id}-${l.kind}-name`}
            aria-describedby={ABOUT[l.kind] ? `${id}-${l.kind}` : undefined}
            onClick={() => open({ kind: l.kind, params: {} })}
          >
            <span id={`${id}-${l.kind}-name`} className="u-group-card-name">
              {l.label}
            </span>
            {ABOUT[l.kind] && (
              <span id={`${id}-${l.kind}`} className="u-group-card-about">
                {ABOUT[l.kind]}
              </span>
            )}
            <LineIcon d={LINE.chevron} size={18} className="u-group-card-go" />
          </button>
        </li>
      ))}
    </ul>
  );
}
