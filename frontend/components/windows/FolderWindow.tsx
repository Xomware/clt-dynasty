"use client";

import { useContext } from "react";

import { IconButton } from "@/components/desktop/IconButton";
import { FolderIcon } from "@/components/xp/icons";
import { groupLabel } from "@/lib/desktop/groups";
import { DrillContext, NavigateContext } from "@/lib/desktop/navigation";
import { useLauncherGroups } from "@/lib/desktop/registry";
import type { WindowParams } from "@/lib/desktop/windows";

import "./folder.css";

// Explorer's large-icon view of one group. A program opens in a window of its
// own, as XP's did; Other Places moves this window to a sibling folder.
export function FolderWindow({ params }: { params: WindowParams }) {
  const open = useContext(DrillContext);
  const navigate = useContext(NavigateContext) ?? open;
  const { groups } = useLauncherGroups();
  const label = groupLabel(params.id);
  const items = groups.find((g) => g.id === params.id)?.items ?? [];

  return (
    <div className="xp-explorer">
      <div className="xp-address">
        <span aria-hidden>Address</span>
        <span className="xp-address-field">
          <FolderIcon className="shrink-0" />
          <input aria-label="Address" readOnly value={`C:\\CLT Dynasty\\${label}`} />
        </span>
      </div>
      <div className="xp-explorer-panes">
        <nav className="xp-task-pane" aria-label="Other Places">
          <h3 className="xp-task-pane-title">Other Places</h3>
          <ul>
            {groups
              .filter((g) => g.id !== params.id)
              .map((g) => (
                <li key={g.id}>
                  <button type="button" className="xp-task-pane-link" onClick={() => navigate({ kind: "folder", params: { id: g.id } })}>
                    <FolderIcon className="shrink-0" />
                    {g.label}
                  </button>
                </li>
              ))}
          </ul>
        </nav>
        {items.length === 0 ? (
          <p className="xp-folder-empty">This folder is empty.</p>
        ) : (
          <ul className="xp-folder-icons" aria-label={label}>
            {items.map(({ kind, label, Icon }) => (
              <li key={kind}>
                <IconButton Icon={Icon} label={label} onOpen={() => open({ kind, params: {} })} />
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="xp-statusbar">
        {items.length} {items.length === 1 ? "object" : "objects"}
      </p>
    </div>
  );
}
