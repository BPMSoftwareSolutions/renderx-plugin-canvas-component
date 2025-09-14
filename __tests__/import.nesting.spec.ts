/* @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock host SDK routing and conductor for package-level tests
vi.mock("@renderx-plugins/host-sdk", () => ({
  resolveInteraction: (key: string) => {
    if (key === "canvas.component.create") {
      return { pluginId: "CanvasComponentPlugin", sequenceId: "canvas-component-create-symphony" };
    }
    return { pluginId: "noop", sequenceId: key };
  },
  EventRouter: { publish: () => {} },
  isFlagEnabled: () => false,
  useConductor: () => ({ play: () => {} }),
}));

import { handlers as createHandlers } from "@renderx-plugins/canvas-component/symphonies/create/create.symphony.ts";
import { parseUiFile } from "@renderx-plugins/canvas-component/symphonies/import/import.parse.pure.ts";
import { injectCssClasses } from "@renderx-plugins/canvas-component/symphonies/import/import.css.stage-crew.ts";
import { createComponentsSequentially, applyHierarchyAndOrder } from "@renderx-plugins/canvas-component/symphonies/import/import.nodes.stage-crew.ts";

// Backwards-compatible handlers object to minimize test changes
const handlers = { parseUiFile, injectCssClasses, createComponentsSequentially, applyHierarchyAndOrder };

function setupCanvas() {
  document.body.innerHTML = `<div id=\"rx-canvas\" style=\"position:absolute; left:0; top:0; width:1200px; height:800px;\"></div>`;
}

function makeCtx() {
  const ops: any[] = [];
  return {
    payload: {},
    io: {
      kv: { put: vi.fn(async (...a: any[]) => ops.push(["kv.put", ...a])) },
    },
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
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
    _ops: ops,
  } as any;
}

describe("canvas-component import: nested structures", () => {
  beforeEach(setupCanvas);

  it("imports container inside container", async () => {
    const ctx = makeCtx();
    ctx.payload.uiFileContent = {
      version: "1.0.0",
      metadata: {},
      cssClasses: {
        "rx-container": {
          name: "rx-container",
          content: ".rx-container{position:relative}",
        },
      },
      components: [
        {
          id: "outer",
          type: "container",
          template: { tag: "div", classRefs: ["rx-comp", "rx-container"] },
          layout: { x: 10, y: 10, width: 400, height: 300 },
          parentId: null,
          siblingIndex: 0,
        },
        {
          id: "inner",
          type: "container",
          template: { tag: "div", classRefs: ["rx-comp", "rx-container"] },
          layout: { x: 20, y: 20, width: 200, height: 150 },
          parentId: "outer",
          siblingIndex: 0,
        },
      ],
    };
    await handlers.parseUiFile({}, ctx);
    await handlers.injectCssClasses({}, ctx);

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

    const inner = document.getElementById("inner")!;
    expect(inner.parentElement?.id).toBe("outer");
    expect((document.getElementById("outer") as HTMLElement).dataset.role).toBe(
      "container"
    );
    expect((document.getElementById("inner") as HTMLElement).dataset.role).toBe(
      "container"
    );
  });

  it("imports grandchild component in nested container", async () => {
    const ctx = makeCtx();
    ctx.payload.uiFileContent = {
      version: "1.0.0",
      metadata: {},
      cssClasses: {
        "rx-container": {
          name: "rx-container",
          content: ".rx-container{position:relative}",
        },
        "rx-button": {
          name: "rx-button",
          content: ".rx-button{background:#3b82f6;color:#fff}",
        },
      },
      components: [
        {
          id: "outer",
          type: "container",
          template: { tag: "div", classRefs: ["rx-comp", "rx-container"] },
          layout: { x: 0, y: 0, width: 500, height: 400 },
          parentId: null,
          siblingIndex: 0,
        },
        {
          id: "inner",
          type: "container",
          template: { tag: "div", classRefs: ["rx-comp", "rx-container"] },
          layout: { x: 20, y: 20, width: 300, height: 200 },
          parentId: "outer",
          siblingIndex: 0,
        },
        {
          id: "btn",
          type: "button",
          template: { tag: "button", classRefs: ["rx-comp", "rx-button"] },
          layout: { x: 10, y: 10, width: 120, height: 40 },
          parentId: "inner",
          siblingIndex: 0,
        },
      ],
    };

    await handlers.parseUiFile({}, ctx);
    await handlers.injectCssClasses({}, ctx);

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

    const btn = document.getElementById("btn")!;
    expect(btn.parentElement?.id).toBe("inner");
    expect(btn.classList.contains("rx-button")).toBe(true);
    const cssText =
      document.getElementById("rx-components-styles")?.textContent || "";
    expect(cssText).toContain(".rx-button");
  });
});

