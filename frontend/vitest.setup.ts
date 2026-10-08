import { cleanup, configure } from "@testing-library/react";
import { afterEach, vi } from "vitest";

import { clearSharedResources } from "@/lib/shared-resource";

// CI runners render slower than a laptop; Smirnoff's suite timed out at 1.18s
// on the 1s default.
configure({ asyncUtilTimeout: 5000 });

// Testing Library only auto-cleans when the runner exposes a global afterEach;
// vitest does not unless `globals: true`.
afterEach(cleanup);
afterEach(clearSharedResources);
// Imported late: a module the setup imports up front loads before a test's
// vi.mock and env stubs, which then never reach it.
afterEach(async () => {
  (await import("@/lib/league/cache")).clearLeagueCache();
  (await import("@/lib/league/nfl-state")).clearNflState();
});

// jsdom has no matchMedia. The default is "no preference"; tests that care stub their own.
vi.stubGlobal(
  "matchMedia",
  (query: string) =>
    ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }) as unknown as MediaQueryList,
);

// Node 25 defines its own global localStorage, which is an empty stub unless
// node runs with --localstorage-file, and it shadows jsdom's working one.
vi.stubGlobal("localStorage", (globalThis as unknown as { jsdom: { window: Window } }).jsdom.window.localStorage);

// jsdom has neither observer. Assigned rather than stubbed, so a test's
// unstubAllGlobals keeps them.
class NoopObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}
globalThis.ResizeObserver ??= NoopObserver as unknown as typeof ResizeObserver;
globalThis.IntersectionObserver ??= NoopObserver as unknown as typeof IntersectionObserver;
// Nor the Web Animations API; with nothing running, there is nothing to list.
Element.prototype.getAnimations ??= () => [];
