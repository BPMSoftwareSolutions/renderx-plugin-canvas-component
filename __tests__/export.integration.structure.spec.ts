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
    io: {
      kv: { getAll: async () => Array.from(kvStore.entries()).map(([id, v]) => ({ id, ...(v as any) })) },
      cssRegistry: { getClass: async (name: string) => ({ name, content: `.${name} {}` }) },
    },
    _ops: ops,
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  } as any;
}

describe("canvas-component export integration (structure)", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id=\"rx-canvas\" style=\"position: relative; width: 1200px; height: 800px;\">
        <button id=\"rx-node-1\" style=\"position: absolute; left: 100px; top: 150px; width: 120px; height: 40px;\">Click Me</button>
        <div id=\"rx-node-2\" style=\"position: absolute; left: 200px; top: 250px; width: 200px; height: 100px;\">Card</div>
      </div>
    `;
  });

  it("should produce valid UI file structure", async () => {
    const ctx = makeIntegrationCtx();
    await queryAllComponents({}, ctx);
    collectCssClasses({}, ctx);
    collectLayoutData({}, ctx);
    buildUiFileContent({}, ctx);

    const uiFile = ctx.payload.uiFileContent;

    expect(uiFile).toMatchObject({
      version: "1.0.1",
      metadata: {
        createdAt: expect.any(String),
        canvasSize: { width: 1200, height: 800 },
        componentCount: 2,
      },
      cssClasses: expect.any(Object),
      components: expect.arrayContaining([
        expect.objectContaining({
          id: "rx-node-1",
          type: "button",
          template: expect.objectContaining({ tag: "button", classRefs: ["rx-comp", "rx-button"], style: expect.any(Object) }),
          layout: expect.objectContaining({ x: 100, y: 150, width: 120, height: 40 }),
          createdAt: expect.any(Number),
        }),
      ]),
    });

    expect(() => JSON.stringify(uiFile)).not.toThrow();
  });
});

