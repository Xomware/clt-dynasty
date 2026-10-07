import type { ComponentType } from "react";

import { GroupPage } from "@/components/uptown/GroupPage";
import type { WindowParams } from "@/lib/desktop/windows";
import { BuzzStandings } from "./BuzzStandings";

// Kinds Buzz City draws itself; every other window renders its shared body in a panel.
export const BODIES: Partial<Record<string, ComponentType<{ params: WindowParams }>>> = {
  folder: GroupPage,
  standings: BuzzStandings,
};
