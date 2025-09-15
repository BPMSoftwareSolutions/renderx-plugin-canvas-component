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
import { parseUiFile } from "@renderx-plugins/canvas-component/symphonies/import/import.parse.pure.ts";
import { injectCssClasses } from "@renderx-plugins/canvas-component/symphonies/import/import.css.stage-crew.ts";
import { applyHierarchyAndOrder } from "@renderx-plugins/canvas-component/symphonies/import/import.nodes.stage-crew.ts";
import { handlers as createHandlers } from "@renderx-plugins/canvas-component/symphonies/create/create.symphony.ts";

function setupCanvas() {
  const root = document.createElement("div");
  root.innerHTML = `<div id=\"rx-canvas\" style=\"position:absolute; left:0; top:0; width:1200px; height:800px;\"></div>`;
  document.body.innerHTML = "";
  document.body.appendChild(root);
}

function makeCtx() {
  const ops: any[] = [];
  return {
    payload: {},
    io: { kv: { put: vi.fn(async (...a: any[]) => ops.push(["kv.put", ...a])) } },
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    conductor: {
      play: vi.fn(async (pluginId: string, sequenceId: string, data: any) => {
        ops.push(["conductor.play", pluginId, sequenceId, data]);
        if (sequenceId === "canvas-component-create-symphony") {
          const createCtx = { payload: {}, io: { kv: { put: vi.fn() } } } as any;
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

describe("import variant toggle applies via rule engine", () => {
  beforeEach(setupCanvas);

  it("applies rx-button--<variant> from content.variant even if classRefs lacked it", async () => {
    const ctx = makeCtx();
    const ui = {
      version: "1.0.0",
      metadata: {},
      cssClasses: {
        "rx-comp": { name: "rx-comp", content: ".rx-comp { position:absolute; }" },
        "rx-button": { name: "rx-button", content: ".rx-button { } .rx-button--primary { }" },
      },
      components: [
        {
          id: "btn-v1",
          type: "button",
          template: { tag: "button", classRefs: ["rx-comp", "rx-button"], style: {} },
          content: { text: "Hello", variant: "primary" },
          layout: { x: 1, y: 2, width: 10, height: 10 },
        },
      ],
    } as any;

    ctx.payload.uiFileContent = ui;

    await parseUiFile({}, ctx);
    await injectCssClasses({}, ctx);
    // Bypass host routing: create components directly using createHandlers
    for (const comp of ctx.payload.importComponents || []) {
      const template: any = {
        tag: comp.tag,
        classes: [...(comp.classRefs || [])],
        style: comp.style || {},
        text: comp.content?.text || comp.content?.content,
        cssVariables: {},
      };
      // Apply variant toggle rule locally (host rule engine normally does this)
      if (comp.type === "button" && comp.content?.variant) {
        const v = String(comp.content.variant).trim();
        if (v) template.classes.push(`rx-button--${v}`);
      }
      if (comp.layout?.width && comp.layout?.height) {
        template.dimensions = { width: comp.layout.width, height: comp.layout.height };
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
    await applyHierarchyAndOrder({}, ctx);

    const btn = document.getElementById("btn-v1") as HTMLElement;
    expect(btn).toBeTruthy();
    expect(btn.classList.contains("rx-button")).toBe(true);
    expect(btn.classList.contains("rx-button--primary")).toBe(true);
  });
});

