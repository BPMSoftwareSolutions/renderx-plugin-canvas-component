/* @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from "vitest";
// Mock host SDK routing and conductor for package-level tests (must be before importing modules that consume it)
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

// Backwards-compatible handlers aggregator for minimal test changes
const handlers = { parseUiFile, injectCssClasses, createComponentsSequentially, applyHierarchyAndOrder };


function setupCanvas() {
  const root = document.createElement("div");
  root.innerHTML = `<div id="rx-canvas" style="position:absolute; left:0; top:0; width:1200px; height:800px;"></div>`;
  document.body.innerHTML = "";
  document.body.appendChild(root);
}

function makeCtx() {
  const ops: any[] = [];
  return {
    payload: {},
    io: {
      kv: {
        put: vi.fn(async (...a: any[]) => ops.push(["kv.put", ...a])),
      },
    },
    logger: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
    conductor: {
      play: vi.fn(async (_pluginId: string, sequenceId: string, data: any) => {
        ops.push(["conductor.play", _pluginId, sequenceId, data]);
        if (sequenceId === "canvas-component-create-symphony") {
          const createCtx = {
            payload: {},
            io: {
              kv: {
                put: vi.fn(async (...a: any[]) => ops.push(["kv.put", ...a])),
              },
            },
          } as any;
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

describe("import flow injects instance class on DOM elements", () => {
  beforeEach(() => setupCanvas());

  it("adds rx-comp-<tag>-<id> class for imported components", async () => {
    const ctx = makeCtx();
    const ui = {
      version: "1.0.0",
      metadata: {},
      cssClasses: {
        "rx-comp": {
          name: "rx-comp",
          content: ".rx-comp { position: absolute; box-sizing: border-box; }",
        },
        "rx-button": {
          name: "rx-button",
          content: ".rx-button { background: #3b82f6; color: white; }",
        },
        "rx-container": {
          name: "rx-container",
          content: ".rx-container { position: relative; }",
        },
      },
      components: [
        {
          id: "container-1",
          type: "container",
          template: { tag: "div", classRefs: ["rx-container"], style: {} },
          layout: { x: 0, y: 0, width: 300, height: 200 },
          parentId: null,
          siblingIndex: 0,
        },
        {
          id: "btn-1",
          type: "button",
          template: { tag: "button", classRefs: ["rx-button"], style: {} },
          content: { text: "Hello" },
          layout: { x: 10, y: 20, width: 120, height: 40 },
          parentId: "container-1",
          siblingIndex: 0,
        },
      ],
    } as any;

    ctx.payload.uiFileContent = ui;

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

    const container = document.getElementById("container-1") as HTMLElement;
    const button = document.getElementById("btn-1") as HTMLElement;

    expect(container).toBeTruthy();
    expect(button).toBeTruthy();

    // compute expected instance classes
    const containerInstance = `rx-comp-div-container-1`;
    const buttonInstance = `rx-comp-button-btn-1`;

    expect(container.classList.contains(containerInstance)).toBe(true);
    expect(button.classList.contains(buttonInstance)).toBe(true);
  });
});

