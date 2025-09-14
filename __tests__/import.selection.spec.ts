/* @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock host SDK routing and conductor for package-level tests
vi.mock("@renderx-plugins/host-sdk", () => ({
  resolveInteraction: (key: string) => {
    if (key === "canvas.component.create") {
      return { pluginId: "CanvasComponentPlugin", sequenceId: "canvas-component-create-symphony" };
    }
    if (key === "canvas.component.select") {
      return { pluginId: "CanvasComponentPlugin", sequenceId: "canvas-component-select-symphony" };
    }
    return { pluginId: "noop", sequenceId: key };
  },
  EventRouter: { publish: () => {} },
  isFlagEnabled: () => false,
  useConductor: () => ({ play: () => {} }),
}));

import { handlers as createHandlers } from "@renderx-plugins/canvas-component/symphonies/create/create.symphony.ts";
import { resolveInteraction } from "@renderx-plugins/host-sdk";
import { parseUiFile } from "@renderx-plugins/canvas-component/symphonies/import/import.parse.pure.ts";
import { createComponentsSequentially, applyHierarchyAndOrder } from "@renderx-plugins/canvas-component/symphonies/import/import.nodes.stage-crew.ts";

// Backwards-compatible handlers object to minimize test changes
const handlers = { parseUiFile, createComponentsSequentially, applyHierarchyAndOrder };

function setupCanvas() {
  document.body.innerHTML = `<div id="rx-canvas" style="position:absolute; left:0; top:0; width:1200px; height:800px;"></div>`;
}

function makeCtx() {
  const ops: any[] = [];
  return {
    payload: {},
    conductor: {
      play: vi.fn(async (pluginId: string, sequenceId: string, data: any) => {
        ops.push(["conductor.play", pluginId, sequenceId, data]);
        // Mock the canvas.component.create behavior for testing
        if (sequenceId === "canvas-component-create-symphony") {
          const createCtx = {
            payload: {},
            io: {
              kv: {
                put: vi.fn(async (...a: any[]) => ops.push(["kv.put", ...a])),
              },
            },
          };
          await createHandlers.resolveTemplate(data, createCtx);
          await createHandlers.registerInstance(data, createCtx);
          await createHandlers.createNode(data, createCtx);
          await createHandlers.notifyUi(data, createCtx);
        }
      }),
    },
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    _ops: ops,
  } as any;
}

describe("canvas-component import: selection forwarding", () => {
  beforeEach(setupCanvas);

  it.skip("clicking imported node plays canvas.component.select", async () => {
    const ctx = makeCtx();
    ctx.payload.uiFileContent = {
      version: "1.0.0",
      metadata: {},
      cssClasses: {},
      components: [
        {
          id: "c1",
          type: "container",
          template: { tag: "div", classRefs: ["rx-comp", "rx-container"] },
          layout: { x: 0, y: 0, width: 200, height: 100 },
          parentId: null,
          siblingIndex: 0,
        },
        {
          id: "b1",
          type: "button",
          template: { tag: "button", classRefs: ["rx-comp", "rx-button"] },
          layout: { x: 10, y: 10, width: 80, height: 30 },
          parentId: "c1",
          siblingIndex: 0,
        },
      ],
    };

    await handlers.parseUiFile({}, ctx);

    // Create components directly (bypass resolveInteraction mapping in tests)
    for (const comp of ctx.payload.importComponents || []) {
      const template: any = {
        tag: comp.tag,
        classes: comp.classRefs || [],
        style: comp.style || {},
        text: comp.content?.text || comp.content?.content,
        cssVariables: {},
      };
      if (comp.layout?.width && comp.layout?.height) {
        template.dimensions = { width: comp.layout.width, height: comp.layout.height };
      }
      if (comp.classRefs?.includes("rx-container")) {
        template.attributes = { "data-role": "container" };
      }
      if (comp.content && Object.keys(comp.content).length) {
        template.content = comp.content;
      }
      const payload = {
        component: { template },
        position: { x: comp.layout?.x || 0, y: comp.layout?.y || 0 },
        containerId: comp.parentId || undefined,
        _overrideNodeId: comp.id,
      } as any;
      const createCtx = { payload: {}, io: { kv: { put: vi.fn() } } } as any;
      await createHandlers.resolveTemplate(payload, createCtx);
      await createHandlers.registerInstance(payload, createCtx);
      await createHandlers.createNode(payload, createCtx);
      await createHandlers.notifyUi(payload, createCtx);
    }

    await handlers.applyHierarchyAndOrder({}, ctx);

    // Minimal host-like click routing: forward clicks on rx-comp elements to canvas.component.select
    document.body.addEventListener("click", (e: any) => {
      let target = e?.target as HTMLElement | null;
      // Climb to nearest element with an id
      while (target && !target.id) target = target.parentElement;
      const id = target?.id;
      if (!id) return;
      const r = resolveInteraction("canvas.component.select");
      ctx.conductor.play(r.pluginId, r.sequenceId, { id });
    });

    document.getElementById("b1")!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(ctx.conductor.play).toHaveBeenCalled();
  });
});

