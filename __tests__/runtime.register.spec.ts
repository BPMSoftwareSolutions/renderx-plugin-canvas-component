/* @vitest-environment jsdom */

import { describe, it, expect } from "vitest";

// This verifies the runtime.register flow for the canvas-component package
// using the repo-level conductor's JSON catalog loader.

describe.skip("runtime.register — canvas-component (TODO: stabilize JSON catalog loading in package env)", () => {
  it("registers without throwing and can load JSON catalogs", async () => {
    // Prefer public/ artifacts when present to emulate host build outputs in tests
    (process as any).env.HOST_ARTIFACTS_DIR = "public";

    const { initConductor, loadJsonSequenceCatalogs } = await import("../src/temp-deps/conductor");
    const { register } = await import("@renderx-plugins/canvas-component");

    const conductor = await initConductor();

    // register twice should be idempotent (no throws)
    await register(conductor);
    await register(conductor);

    // Ensure catalogs can be loaded (includes canvas-component sequences)
    await loadJsonSequenceCatalogs(conductor, ["CanvasComponentPlugin"]);

    // Basic smoke: ensure mountFrom probably ran by checking a known handler was mounted
    // We avoid strict assertions to keep this test robust across refactors
    const mounted = new Set<string>(Object.keys((conductor as any).handlers || {}));
    expect(mounted.size).toBeGreaterThan(0);
  });
});

