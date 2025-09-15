/* @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { queryAllComponents } from "@renderx-plugins/canvas-component/symphonies/export/export.io.ts";
import { collectCssClasses } from "@renderx-plugins/canvas-component/symphonies/export/export.css.stage-crew.ts";
import { collectLayoutData } from "@renderx-plugins/canvas-component/symphonies/export/export.stage-crew.ts";
import { buildUiFileContent } from "@renderx-plugins/canvas-component/symphonies/export/export.pure.ts";

function makeIntegrationCtx() {
  const ops: any[] = [];
  const kvStore = new Map();
  kvStore.set("rx-node-1", { type: "button", classes: ["rx-comp", "rx-button"], style: {}, createdAt: 1 });
  kvStore.set("rx-node-2", { type: "div", classes: ["rx-comp", "rx-card"], style: {}, createdAt: 2 });

  return {
    payload: {},
    io: { kv: { getAll: async () => Array.from(kvStore.entries()).map(([id, v]) => ({ id, ...(v as any) })) } },
    _ops: ops,
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  } as any;
}

describe("canvas-component export integration (DOM errors)", () => {
  beforeEach(() => {
    // Ensure clean DOM; individual tests adjust as needed
    document.body.innerHTML = "";
  });

  it("should handle DOM errors gracefully", async () => {
    const ctx = makeIntegrationCtx();

    await queryAllComponents({}, ctx);
    collectCssClasses({}, ctx);
    collectLayoutData({}, ctx);
    buildUiFileContent({}, ctx);

    expect(ctx.payload.error).toContain("Canvas container not found");
    expect(ctx.payload.uiFileContent.components).toHaveLength(2);
    expect(ctx.payload.uiFileContent.components[0].layout).toEqual({ x: 0, y: 0, width: 0, height: 0 });
    expect(ctx.payload.uiFileContent.cssClasses).toBeDefined();
  });
});

