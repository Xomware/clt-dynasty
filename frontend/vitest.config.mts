import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Resolves the "@/*" alias from tsconfig.json natively -- no plugin needed.
    tsconfigPaths: true,
  },
  test: {
    environment: "jsdom",
    include: ["**/*.test.{ts,tsx}"],
    setupFiles: ["./vitest.setup.ts"],
    // afterEach in the order written, so the setup's unmount and cache clears run
    // before a test file's restoreAllMocks. Under the default "stack" order the
    // unmount ran last and flushed effects that started fetches after the clears,
    // through the restored real fetch, into the next test.
    sequence: { hooks: "list" },
  },
});
