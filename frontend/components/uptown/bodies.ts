import type { ComponentType } from "react";

import type { WindowParams } from "@/lib/desktop/windows";
import { GroupPage } from "./GroupPage";

// Kinds whose XP body is shell chrome rather than content.
export const OVERRIDES: Partial<Record<string, ComponentType<{ params: WindowParams }>>> = { folder: GroupPage };
