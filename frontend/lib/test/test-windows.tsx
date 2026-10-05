import { useContext } from "react";
import { afterAll, beforeAll } from "vitest";

import { NavigateContext } from "@/lib/desktop/navigation";
import { REGISTRY, type WindowKind, type WindowSpec } from "@/lib/desktop/registry";
import type { WindowParams } from "@/lib/desktop/windows";
import { HomeIcon, ProfileIcon, StandingsIcon } from "@/components/xp/icons";

function StandingsBody() {
  const navigate = useContext(NavigateContext);
  return (
    <button type="button" onClick={() => navigate?.({ kind: "team" as WindowKind, params: { rosterId: 6 } })}>
      Team 6
    </button>
  );
}

function Broken(): never {
  throw new Error("bad row");
}

// Stand-in windows, so the shell's tests don't change as real windows land.
const TEST_SPECS: Record<string, WindowSpec> = {
  home: { label: "Home", title: "CLT Dynasty League", Icon: HomeIcon, component: () => <p>home body</p>, defaultSize: { w: 600, h: 400 } },
  standings: { label: "Standings", title: "League Standings", Icon: StandingsIcon, component: StandingsBody, defaultSize: { w: 500, h: 500 } },
  broken: { label: "Broken", title: "Broken", Icon: HomeIcon, component: Broken, defaultSize: { w: 400, h: 300 } },
  team: {
    label: "Team",
    title: (p: WindowParams) => `Team ${p.rosterId}`,
    Icon: ProfileIcon,
    component: ({ params }) => <p>team {params.rosterId}</p>,
    defaultSize: { w: 500, h: 500 },
    link: (v) => (/^[1-9]\d*$/.test(v) ? { rosterId: Number(v) } : null),
    drillOnly: true,
  },
};

export const kind = (k: string) => k as WindowKind;

// Swaps the real windows out for the stand-ins, and back afterwards.
export function registerTestWindows() {
  const real = { ...REGISTRY };
  beforeAll(() => {
    for (const k of Object.keys(real)) delete REGISTRY[k];
    Object.assign(REGISTRY, TEST_SPECS);
  });
  afterAll(() => {
    for (const k of Object.keys(TEST_SPECS)) delete REGISTRY[k];
    Object.assign(REGISTRY, real);
  });
}
