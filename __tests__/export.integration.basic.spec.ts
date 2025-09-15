/* @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { queryAllComponents } from "@renderx-plugins/canvas-component/symphonies/export/export.io.ts";
import { collectCssClasses } from "@renderx-plugins/canvas-component/symphonies/export/export.css.stage-crew.ts";
import { collectLayoutData } from "@renderx-plugins/canvas-component/symphonies/export/export.stage-crew.ts";
import { buildUiFileContent } from "@renderx-plugins/canvas-component/symphonies/export/export.pure.ts";
import { downloadUiFile } from "@renderx-plugins/canvas-component/symphonies/export/export.download.stage-crew.ts";

function makeIntegrationCtx() {
  const ops: any[] = [];
  const kvStore = new Map();

  // Pre-populate with test data
  kvStore.set("rx-node-1", {
    type: "button",
    classes: ["rx-comp", "rx-button"],
    style: { padding: "8px 12px", borderRadius: "8px" },
    createdAt: 1724668200000,
  });
  kvStore.set("rx-node-2", {
    type: "div",
    classes: ["rx-comp", "rx-card"],
    style: { padding: "12px", boxShadow: "0 2px 8px rgba(0,0,0,.1)" },
    createdAt: 1724668300000,
  });

  return {
    payload: {},
    io: {
      kv: {
        getAll: async () => {
          ops.push(["kv.getAll"]);
          const result: any[] = [];
          for (const [key, value] of kvStore.entries()) {
            result.push({ id: key, ...value });
          }
          return result;
        },
      },
      cssRegistry: {
        getClass: async (className: string) => ({
          name: className,
          content: `.${className} { /* mock CSS */ }`,
          isBuiltIn: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }),
      },
    },
    _ops: ops,
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  } as any;
}

describe("canvas-component export integration (basic)", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="rx-canvas" style="position: relative; width: 1200px; height: 800px;">
        <button id="rx-node-1" style="position: absolute; left: 100px; top: 150px; width: 120px; height: 40px;">Click Me</button>
        <div id="rx-node-2" style="position: absolute; left: 200px; top: 250px; width: 200px; height: 100px;">Card</div>
      </div>
    `;

    global.URL.createObjectURL = vi.fn(() => "blob:mock-url");
    global.URL.revokeObjectURL = vi.fn();
  });

  it("should complete full export flow successfully", async () => {
    const ctx = makeIntegrationCtx();

    const mockAnchor = { href: "", download: "", click: vi.fn() } as any;
    vi.spyOn(document, "createElement").mockReturnValue(mockAnchor);

    await queryAllComponents({}, ctx);
    expect(ctx.payload.components).toHaveLength(2);

    collectCssClasses({}, ctx);
    expect(ctx.payload.cssClasses).toBeDefined();
    expect(Object.keys(ctx.payload.cssClasses).length).toBeGreaterThan(0);

    collectLayoutData({}, ctx);
    expect(ctx.payload.layoutData).toHaveLength(2);
    expect(ctx.payload.canvasMetadata).toMatchObject({ width: 1200, height: 800 });

    buildUiFileContent({}, ctx);
    expect(ctx.payload.uiFileContent).toBeDefined();
    expect(ctx.payload.uiFileContent.components).toHaveLength(2);
    expect(ctx.payload.uiFileContent.cssClasses).toBeDefined();

    await downloadUiFile({}, ctx);
    expect(ctx.payload.downloadTriggered).toBe(true);
    expect(mockAnchor.click).toHaveBeenCalled();
    expect(mockAnchor.download).toMatch(/canvas-design-.*\.ui/);
  });

  it("should handle missing components gracefully", async () => {
    const ctx = makeIntegrationCtx();
    ctx.io.kv.getAll = async () => [];

    await queryAllComponents({}, ctx);
    collectCssClasses({}, ctx);
    collectLayoutData({}, ctx);
    buildUiFileContent({}, ctx);

    expect(ctx.payload.uiFileContent.components).toEqual([]);
    expect(ctx.payload.uiFileContent.metadata.componentCount).toBe(0);
    expect(ctx.payload.uiFileContent.cssClasses).toEqual({});
  });
});

