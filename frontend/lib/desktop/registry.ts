import type { ComponentType, SVGProps } from "react";

import { SettingsWindow } from "@/components/windows/SettingsWindow";
import { ControlPanelIcon } from "@/components/xp/icons";

import type { WindowParams, WindowView } from "./windows";

export interface WindowSpec {
  // Short name on the desktop icon, the Start menu and the phone's program list.
  label: string;
  title: string | ((params: WindowParams) => string);
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
  component: ComponentType<{ params: WindowParams }>;
  defaultSize: { w: number; h: number };
  // Reads a `?open=kind:value` link's value back into params. Without it the
  // kind takes no value.
  link?: (value: string) => WindowParams | null;
  // Opened only by a drill from another window (a team, a player), never
  // from the desktop, Start or the phone's list.
  drillOnly?: boolean;
}

// One entry per window kind, in launcher order. Each league window adds itself here.
const SPECS = {
  settings: { label: "Settings", title: "Settings", Icon: ControlPanelIcon, component: SettingsWindow, defaultSize: { w: 520, h: 520 } },
} satisfies Record<string, WindowSpec>;

export type WindowKind = keyof typeof SPECS;
export const REGISTRY: Record<string, WindowSpec> = SPECS;

export const isKind = (kind: string): kind is WindowKind => Object.hasOwn(REGISTRY, kind);

// What the desktop, Start and the phone list offer.
export const launchers = () =>
  Object.entries(REGISTRY)
    .filter(([, spec]) => !spec.drillOnly)
    .map(([kind, spec]) => ({ kind: kind as WindowKind, ...spec }));

export function windowTitle({ kind, params }: WindowView): string {
  const { title } = REGISTRY[kind];
  return typeof title === "string" ? title : title(params);
}
