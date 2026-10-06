"use client";

import { useEffect, useLayoutEffect, useRef } from "react";

import { FolderIcon } from "@/components/xp/icons";
import { openLinks, parseOpen, syncUrl } from "@/lib/desktop/deep-link";
import { useDesktop } from "@/lib/desktop/desktop-context";
import { DrillContext } from "@/lib/desktop/navigation";
import { loadLayout, saveLayout } from "@/lib/desktop/persist";
import { useLauncherGroups } from "@/lib/desktop/registry";
import { defaultLayout, type WindowState } from "@/lib/desktop/windows";
import { useMember } from "@/lib/member/use-member";
import { DesktopWindow } from "./DesktopWindow";
import { IconButton } from "./IconButton";

export function Desktop() {
  const { windows, open, active, dispatch } = useDesktop();
  const activeId = active?.id;
  const { state } = useMember();
  // Layouts are saved per member, keyed by the roster email, in this browser only.
  const owner = state.status === "member" ? state.me.member.email : undefined;
  const restored = useRef<WindowState[] | null>(null);
  const live = useRef(false);
  const { pinned, groups } = useLauncherGroups();

  // Before paint, so the default layout never flashes up first.
  useLayoutEffect(() => {
    const { innerWidth: vw, innerHeight: vh } = window;
    const base = (owner && loadLayout(owner)) || defaultLayout();
    restored.current = openLinks(base, parseOpen(window.location.search), vw, vh);
    dispatch({ type: "restore", windows: restored.current });
  }, [owner, dispatch]);

  useEffect(() => {
    // The commit that dispatched the restore still holds the old layout, and
    // saving that would overwrite the user's.
    if (!live.current && windows !== restored.current) return;
    live.current = true;
    if (owner) saveLayout(owner, windows);
    syncUrl(windows);
  }, [windows, owner]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!activeId || !e.altKey || (e.key !== "ArrowLeft" && e.key !== "ArrowRight")) return;
      // Option+Arrow moves by word in a text field on macOS.
      if (e.target instanceof Element && e.target.closest("input, textarea, [contenteditable]")) return;
      // Otherwise the browser takes Alt+Left as its own Back and leaves the site.
      e.preventDefault();
      dispatch({ type: e.key === "ArrowLeft" ? "back" : "forward", id: activeId });
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [activeId, dispatch]);

  return (
    <DrillContext value={({ kind, params }) => open(kind, params)}>
      <main className="xp-desktop">
        <h1 className="sr-only">CLT Dynasty League</h1>
        <ul className="xp-desktop-icons" aria-label="Desktop">
          {pinned.map(({ kind, label, Icon }) => (
            <li key={kind}>
              <IconButton Icon={Icon} label={label} onOpen={() => open(kind)} />
            </li>
          ))}
          {groups.map((g) => (
            <li key={g.id}>
              <IconButton Icon={FolderIcon} label={g.label} onOpen={() => open("folder", { id: g.id })} />
            </li>
          ))}
        </ul>
        {windows.map((w) => (
          <DesktopWindow key={w.id} win={w} />
        ))}
        {/* CC BY-SA 3.0 requires credit for the wallpaper photo. */}
        <a
          className="xp-wallpaper-credit"
          href="https://commons.wikimedia.org/wiki/File:A_hill_covered_with_green_grass.jpg"
          target="_blank"
          rel="noreferrer"
        >
          Wallpaper: arifovic Jelic Zora, CC BY-SA 3.0
        </a>
      </main>
    </DrillContext>
  );
}
