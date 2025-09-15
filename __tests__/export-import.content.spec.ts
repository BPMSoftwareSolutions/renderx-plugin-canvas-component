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
  getTagForType: (type: string) => type === "button" ? "button" : "div",
}));
import { resolveInteraction } from "@renderx-plugins/host-sdk";


import { queryAllComponents } from "../src/symphonies/export/export.io.ts";
import { discoverComponentsFromDom } from "../src/symphonies/export/export.discover.stage-crew.ts";
import { collectCssClasses } from "../src/symphonies/export/export.css.stage-crew.ts";
import { collectLayoutData } from "../src/symphonies/export/export.stage-crew.ts";
import { buildUiFileContent } from "../src/symphonies/export/export.pure.ts";
import { parseUiFile } from "@renderx-plugins/canvas-component/symphonies/import/import.parse.pure.ts";
import { injectCssClasses } from "@renderx-plugins/canvas-component/symphonies/import/import.css.stage-crew.ts";
import { applyHierarchyAndOrder } from "@renderx-plugins/canvas-component/symphonies/import/import.nodes.stage-crew.ts";
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
    // Dimensions for inline width/height
    if (layout?.width != null || layout?.height != null) {
      template.dimensions = { width: layout.width, height: layout.height };
    }
    // Mark containers for role-specific behavior
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
  root.innerHTML = `<div id=\"rx-canvas\" style=\"position: relative; width: 1200px; height: 800px;\"></div>`;
  document.body.innerHTML = "";
  document.body.appendChild(root);
}

function makeExportCtx() {
  const ops: any[] = [];
  const kvStore = new Map();
  return {
    payload: {},
    io: {
      kv: {
        getAll: vi.fn(async () => Array.from(kvStore.values())),
        put: vi.fn(async (...a: any[]) => ops.push(["kv.put", ...a])),
      },
      cssRegistry: { getClass: vi.fn((name: string) => ({ name, content: `.${name} { display: block; }` })) },
    },
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    _ops: ops,
    _kvStore: kvStore,
  } as any;
}

function makeImportCtx() {
  const ops: any[] = [];
  return {
    payload: {},
    io: { kv: { put: vi.fn(async (...a: any[]) => ops.push(["kv.put", ...a])) } },
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    conductor: {
      play: vi.fn(async (_pluginId: string, sequenceId: string, data: any) => {
        ops.push(["conductor.play", _pluginId, sequenceId, data]);
        if (sequenceId === "canvas-component-create-symphony") {
          const createCtx = { payload: {}, io: { kv: { put: vi.fn(async (...a: any[]) => ops.push(["kv.put", ...a])) } } } as any;
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

describe("canvas-component export/import content preservation (migrated)", () => {
  beforeEach(() => { setupCanvas(); });

  it("should export and import button content correctly", async () => {
    const exportCtx = makeExportCtx();

    document.body.innerHTML = `
      <div id=\"rx-canvas\" style=\"position: relative; width: 1200px; height: 800px;\">
        <button id=\"btn-1\" class=\"rx-comp rx-button\" style=\"position: absolute; left: 100px; top: 150px; width: 120px; height: 40px;\">Save Changes</button>
      </div>
    `;

    exportCtx.io.kv.getAll = vi.fn(async () => []);

    await queryAllComponents({}, exportCtx);
    discoverComponentsFromDom({}, exportCtx);
    await collectCssClasses({}, exportCtx);
    collectLayoutData({}, exportCtx);
    buildUiFileContent({}, exportCtx);

    const uiFile = exportCtx.payload.uiFileContent;
    const buttonComponent = uiFile.components.find((c: any) => c.id === "btn-1");
    expect(buttonComponent).toBeDefined();
    expect(buttonComponent.content).toBeDefined();
    expect(buttonComponent.content.content).toBe("Save Changes");

    const importCtx = makeImportCtx();
    setupCanvas();
    importCtx.payload.uiFileContent = uiFile;

    parseUiFile({}, importCtx);
    injectCssClasses({}, importCtx);
    await createComponentsSequentiallyTest({}, importCtx);
    applyHierarchyAndOrder({}, importCtx);

    const importedButton = document.getElementById("btn-1") as HTMLButtonElement;
    expect(importedButton).toBeTruthy();
    expect(importedButton.textContent).toBe("Save Changes");

    const kvCalls = importCtx._ops.filter((op: any) => op[0] === "kv.put");
    const buttonKvCall = kvCalls.find((call: any) => call[1] === "btn-1");
    expect(buttonKvCall).toBeDefined();
    expect(buttonKvCall[2].content).toBeDefined();
    expect(buttonKvCall[2].content.content).toBe("Save Changes");
  });
});

