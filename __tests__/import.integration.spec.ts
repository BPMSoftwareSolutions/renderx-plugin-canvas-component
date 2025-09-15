/* @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from "vitest";
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
import { resolveInteraction } from "@renderx-plugins/host-sdk";


import { parseUiFile } from "@renderx-plugins/canvas-component/symphonies/import/import.parse.pure.ts";
import { injectCssClasses } from "@renderx-plugins/canvas-component/symphonies/import/import.css.stage-crew.ts";
import { applyHierarchyAndOrder } from "@renderx-plugins/canvas-component/symphonies/import/import.nodes.stage-crew.ts";
import { registerInstances } from "@renderx-plugins/canvas-component/symphonies/import/import.io.ts";
import { handlers as createHandlers } from "@renderx-plugins/canvas-component/symphonies/create/create.symphony.ts";
async function createComponentsSequentiallyTest(_data: any, ctx: any) {
  const components: any[] = ctx.payload.importComponents || [];
  for (const comp of components) {
    const layout = comp.layout || {};
    const template: any = {
      tag: comp.template?.tag || comp.tag,
      classes: comp.template?.classRefs || comp.classRefs || [],
      style: comp.template?.style || comp.style || {},
      text: comp.content?.text || comp.content?.content,
      content: comp.content || {},
      cssVariables: comp.cssVariables || {},
      css: comp.css,
    };
    if (layout?.width != null || layout?.height != null) {
      template.dimensions = { width: layout.width, height: layout.height };
    }
    if ((comp.classRefs || []).includes("rx-container")) {
      template.attributes = { ...(template.attributes || {}), "data-role": "container" };
    }
    const createPayload = {
      component: { template, layout, content: comp.content },
      _overrideNodeId: comp.id,
      position: { x: layout?.x ?? 0, y: layout?.y ?? 0 },
      containerId: comp.parentId || null,
    };
    const route = resolveInteraction("canvas.component.create");
    await ctx.conductor.play(route.pluginId, route.sequenceId, createPayload);
  }
}


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
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    conductor: {
      play: vi.fn(async (pluginId: string, sequenceId: string, data: any) => {
        ops.push(["conductor.play", pluginId, sequenceId, data]);
        // Minimal create route for test
        if (sequenceId === "canvas-component-create-symphony") {
          const createCtx = {
            payload: {},
            io: { kv: { put: vi.fn(async (...a: any[]) => ops.push(["kv.put", ...a])) } },
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

describe("canvas-component import integration (migrated)", () => {
  beforeEach(() => {
    setupCanvas();
  });

  it("imports UI file: injects css, creates DOM hierarchy, applies layout, registers KV", async () => {
    const ctx = makeCtx();
    const ui = {
      version: "1.0.0",
      metadata: { createdAt: new Date().toISOString(), canvasSize: { width: 1200, height: 800 }, componentCount: 2 },
      cssClasses: {
        "rx-comp": { name: "rx-comp", content: ".rx-comp { position: absolute; box-sizing: border-box; }" },
        "rx-button": { name: "rx-button", content: ".rx-button { background: #3b82f6; color: white; }" },
        "rx-container": { name: "rx-container", content: ".rx-container { position: relative; }" },
      },
      components: [
        {
          id: "container-1",
          type: "container",
          template: { tag: "div", classRefs: ["rx-comp", "rx-container"], style: {} },
          layout: { x: 10, y: 20, width: 300, height: 200 },
          parentId: null, siblingIndex: 0, createdAt: Date.now(),
        },
        {
          id: "btn-1",
          type: "button",
          template: { tag: "button", classRefs: ["rx-comp", "rx-button"], style: { background: "rgb(0, 122, 204)", color: "rgb(255, 255, 255)", padding: "8px 16px" } },
          content: { content: "Submit Form", text: "Submit Form", disabled: false },
          layout: { x: 30, y: 40, width: 120, height: 40 },
          parentId: "container-1", siblingIndex: 0, createdAt: Date.now(),
        },
      ],
    };

    ctx.payload.uiFileContent = ui;

    // Execute import flow
    parseUiFile({}, ctx);
    injectCssClasses({}, ctx);
    await createComponentsSequentiallyTest({}, ctx);
    await registerInstances({}, ctx);
    applyHierarchyAndOrder({}, ctx);

    // Validate CSS injected
    const container = document.getElementById("container-1") as HTMLElement | null;
    const btn = document.getElementById("btn-1") as HTMLElement | null;
    expect(container).toBeTruthy();
    expect(btn).toBeTruthy();

    // Parent/child relationship
    expect(btn?.parentElement?.id).toBe("container-1");

    // Layout styles
    expect(btn?.style.position).toBe("absolute");
    expect(btn?.style.left).toBe("30px");
    expect(btn?.style.top).toBe("40px");
    expect(btn?.style.width).toBe("120px");
    expect(btn?.style.height).toBe("40px");

    // Content properties applied
    expect(btn?.textContent).toBe("Submit Form");

    // KV registered for both
    const puts = ctx._ops.filter((o: any[]) => o[0] === "kv.put");
    expect(puts.length).toBeGreaterThanOrEqual(2);
  });
});

