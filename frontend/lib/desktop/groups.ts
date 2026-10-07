// How the shell files its programs. Each launchable window names its group in
// the registry; this list orders the groups, and every surface (desktop
// folders, Start's All Programs, the phone's list) reads both.
export const GROUPS = [
  { id: "league", label: "League" },
  { id: "history", label: "History" },
  { id: "draft", label: "Draft" },
  { id: "mine", label: "My Stuff" },
  { id: "community", label: "Community" },
] as const;

// Filed but kept out of GROUPS: admins open these from their account menu
// (Buzz City's account menu, XP's Start places), never from the top-level nav.
export const ADMIN = { id: "admin", label: "Admin" } as const;

export type GroupId = (typeof GROUPS)[number]["id"] | typeof ADMIN.id;

export const isGroup = (id: string): id is GroupId => GROUPS.some((g) => g.id === id);

export const groupLabel = (id: unknown) => [...GROUPS, ADMIN].find((g) => g.id === id)?.label ?? "Folder";

// Start's left column, above the recent programs, and its right column, XP's
// My Documents / Control Panel / Help side.
export const START_PINNED = ["home", "standings", "scores"];
export const START_PLACES = ["my-team", "profile", "settings", "rules", "search"];
