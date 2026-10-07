import type { ComponentType, Ref } from "react";

import { GroupPage } from "@/components/uptown/GroupPage";
import type { WindowParams } from "@/lib/desktop/windows";

// Kinds Buzz City draws itself; every other window renders its shared body in a panel.
export const BODIES: Partial<Record<string, ComponentType<{ params: WindowParams }>>> = { folder: GroupPage };

// Home's own page, which brings its heading; until it lands Home is a window body too.
export const HOME_PAGE: ComponentType<{ ref?: Ref<HTMLHeadingElement>; phone?: boolean }> | null = null;
