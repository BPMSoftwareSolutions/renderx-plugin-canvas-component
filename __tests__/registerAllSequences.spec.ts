/* @vitest-environment jsdom */

import { describe, it, expect } from "vitest";

// Ensures registerAllSequences mounts canvas-component sequences from catalogs

describe.skip("registerAllSequences mounts canvas-component sequences (TODO: stabilize catalogs in package test env)", () => {
  it("mounts expected sequences and handlers for CanvasComponentPlugin", async () => {
    (process as any).env.HOST_ARTIFACTS_DIR = "public";

    const { initConductor, registerAllSequences } = await import("../src/temp-deps/conductor");
    const conductor = await initConductor();

    await registerAllSequences(conductor);

    // Expect at least some canvas-component* sequences to have been mounted
    const ids = new Set<string>(Object.keys((conductor as any).sequences || {}));
    const hasCanvasComp = Array.from(ids).some((id) => id.includes("canvas-component") || id.includes("CanvasComponent"));
    expect(hasCanvasComp).toBe(true);
  });
});

