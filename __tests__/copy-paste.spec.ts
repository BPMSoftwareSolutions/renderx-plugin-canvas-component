/* @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock host SDK helpers used by handlers/sequences
vi.mock("@renderx-plugins/host-sdk", () => ({
  resolveInteraction: (key: string) => {
    if (key === "canvas.component.create") {
      return { pluginId: "CanvasComponentPlugin", sequenceId: "canvas-component-create-symphony" };
    }
    return { pluginId: "noop", sequenceId: key };
  },
  EventRouter: { publish: vi.fn(async () => {}) },
  isFlagEnabled: () => false,
  useConductor: () => ({ play: () => {} }),
}));
import { resolveInteraction, EventRouter } from "@renderx-plugins/host-sdk";

import { handlers as createHandlers } from "@renderx-plugins/canvas-component/symphonies/create/create.symphony.ts";
import { handlers as selectHandlers } from "@renderx-plugins/canvas-component/symphonies/select/select.symphony.ts";
import { handlers as copyHandlers } from "@renderx-plugins/canvas-component/symphonies/copy/copy.symphony.ts";
import { handlers as pasteHandlers } from "@renderx-plugins/canvas-component/symphonies/paste/paste.symphony.ts";

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

function createButton(ctx: any, id = "btn-1", position = { x: 30, y: 40 }) {
  const template = {
    tag: "button",
    classes: ["rx-comp", "rx-button"],
    style: { background: "rgb(0, 122, 204)", color: "rgb(255, 255, 255)", padding: "8px 16px" },
    text: "Submit",
  };
  const payload = {
    component: { template },
    _overrideNodeId: id,
    position,
  };
  const route = resolveInteraction("canvas.component.create");
  return ctx.conductor.play(route.pluginId, route.sequenceId, payload);
}

describe("canvas-component copy/paste", () => {
  beforeEach(() => {
    setupCanvas();
    // Reset clipboard mocks between tests
    (globalThis as any).navigator = (globalThis as any).navigator || {};
    (globalThis as any).navigator.clipboard = {
      writeText: vi.fn(async (_s: string) => {}),
      readText: vi.fn(async () => ""),
    };
    (EventRouter.publish as any).mockClear?.();
  });

  it("serializes selected component and writes to clipboard on copy", async () => {
    const ctx = makeCtx();

    await createButton(ctx, "btn-1", { x: 30, y: 40 });

    // Select the component so overlay carries selected id
    selectHandlers.showSelectionOverlay({ id: "btn-1" }, ctx);

    // Run copy flow handlers
    const baton1 = await copyHandlers.serializeSelectedComponent({}, ctx);
    await copyHandlers.copyToClipboard(baton1, ctx);
    await copyHandlers.notifyCopyComplete(baton1, ctx);

    const clipWrite = (navigator as any).clipboard.writeText as any;
    expect(clipWrite).toHaveBeenCalledTimes(1);

    const [arg] = clipWrite.mock.calls[0];
    const data = JSON.parse(arg);

    expect(data?.type).toBe("renderx-component");
    expect(data?.component?.id).toBe("btn-1");
    expect(data?.component?.template?.tag).toBe("button");
    expect(data?.component?.position).toEqual({ x: 30, y: 40 });

    // Published notify topic
    expect((EventRouter.publish as any)).toHaveBeenCalledWith(
      "canvas.component.copied",
      expect.any(Object),
      ctx.conductor
    );
  });

  it("reads from clipboard and creates a pasted component at +20/+20 offset", async () => {
    const ctx = makeCtx();

    await createButton(ctx, "btn-1", { x: 30, y: 40 });
    selectHandlers.showSelectionOverlay({ id: "btn-1" }, ctx);

    // Prepare clipboard content by running serialize
    const baton1 = await copyHandlers.serializeSelectedComponent({}, ctx);
    const serialized = JSON.stringify(baton1.clipboardData);
    (navigator as any).clipboard.readText = vi.fn(async () => serialized);

    // Run paste flow
    const b1 = await pasteHandlers.readFromClipboard({}, ctx);
    const b2 = await pasteHandlers.deserializeComponentData(b1, ctx);
    const b3 = await pasteHandlers.calculatePastePosition(b2, ctx);
    await pasteHandlers.createPastedComponent(b3, ctx);
    await pasteHandlers.notifyPasteComplete(b3, ctx);

    // We expect create to have been invoked for the pasted component
    const plays = ctx._ops.filter((o: any[]) => o[0] === "conductor.play");
    const lastPlay = plays[plays.length - 1];
    expect(lastPlay[1]).toBe("CanvasComponentPlugin");
    expect(lastPlay[2]).toBe("canvas-component-create-symphony");

    const payload = lastPlay[3];
    expect(payload?.position).toEqual({ x: 50, y: 60 }); // offset +20/+20

    // DOM contains the new element with a new id (not equal to original)
    const original = document.getElementById("btn-1");
    expect(original).toBeTruthy();
    const allButtons = Array.from(document.querySelectorAll("button.rx-comp"));
    expect(allButtons.length).toBeGreaterThanOrEqual(2);

    // Publish notify topic
    expect((EventRouter.publish as any)).toHaveBeenCalledWith(
      "canvas.component.pasted",
      expect.any(Object),
      ctx.conductor
    );
  });
});

