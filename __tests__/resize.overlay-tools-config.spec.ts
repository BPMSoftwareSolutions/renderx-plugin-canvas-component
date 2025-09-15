/* @vitest-environment jsdom */
import { describe, it, expect, beforeEach } from "vitest";
import { handlers as createHandlers } from "@renderx-plugins/canvas-component/symphonies/create/create.symphony.ts";
import { showSelectionOverlay } from "@renderx-plugins/canvas-component/symphonies/select/select.stage-crew.ts";
import { handlers as resizeHandlers } from "@renderx-plugins/canvas-component/symphonies/resize/resize.symphony.ts";

function dispatchMouse(el: Element | Document, type: string, opts: any) {
  const ev = new MouseEvent(type, { bubbles: true, cancelable: true, ...opts });
  (el as any).dispatchEvent(ev);
}

describe("resize overlay driven by template tools config", () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="rx-canvas" style="position:relative"></div>';
  });

  it("shows only handles listed in data-resize-handles", () => {
    const ctx: any = { payload: {} };
    const template = {
      tag: "div",
      text: "",
      classes: ["rx-comp", "rx-box"],
      css: ".rx-box { background: #eee; }",
      cssVariables: {},
      dimensions: { width: 100, height: 60 },
      attributes: {
        "data-resize-enabled": "true",
        "data-resize-handles": "e,se,s",
      },
    } as any;

    createHandlers.resolveTemplate({ component: { template } } as any, ctx);
    createHandlers.createNode({ position: { x: 10, y: 20 } } as any, ctx);

    const id = ctx.payload.nodeId as string;

    const conductor = {
      play: (_pluginId: string, seqId: string, payload: any) => {
        if (seqId === "canvas-component-resize-start-symphony") {
          resizeHandlers.startResize?.(payload, {});
        } else if (seqId === "canvas-component-resize-move-symphony") {
          resizeHandlers.updateSize?.(payload, {});
        } else if (seqId === "canvas-component-resize-end-symphony") {
          resizeHandlers.endResize?.(payload, {});
        }
      },
    };

    showSelectionOverlay({ id }, { conductor });

    const overlay = document.getElementById("rx-selection-overlay")! as HTMLDivElement;
    const handles = Array.from(overlay.querySelectorAll(".rx-handle")) as HTMLDivElement[];

    const visible = handles
      .filter((h) => (h.style.display || "") !== "none")
      .map((h) => Array.from(h.classList).find((c) => ["n", "s", "e", "w", "nw", "ne", "sw", "se"].includes(c)));

    expect(new Set(visible)).toEqual(new Set(["e", "se", "s"]));
  });

  it("enforces min width/height constraints from data attributes during resize", async () => {
    const ctx: any = { payload: {} };
    const template = {
      tag: "div",
      text: "",
      classes: ["rx-comp", "rx-box"],
      css: ".rx-box { background: #eee; }",
      cssVariables: {},
      dimensions: { width: 100, height: 50 },
      attributes: {
        "data-resize-enabled": "true",
        "data-resize-handles": "nw,ne,se,sw,n,s,e,w",
        "data-resize-min-w": "80",
        "data-resize-min-h": "30",
      },
    } as any;

    createHandlers.resolveTemplate({ component: { template } } as any, ctx);
    createHandlers.createNode({ position: { x: 10, y: 20 } } as any, ctx);

    const id = ctx.payload.nodeId as string;

    const conductor = {
      play: (_pluginId: string, seqId: string, payload: any) => {
        if (seqId === "canvas-component-resize-start-symphony") {
          resizeHandlers.startResize?.(payload, {});
        } else if (seqId === "canvas-component-resize-move-symphony") {
          resizeHandlers.updateSize?.(payload, {});
        } else if (seqId === "canvas-component-resize-end-symphony") {
          resizeHandlers.endResize?.(payload, {});
        }
      },
    };

    showSelectionOverlay({ id }, { conductor });

    const overlay = document.getElementById("rx-selection-overlay")! as HTMLDivElement;
    const se = overlay.querySelector(".rx-handle.se")! as HTMLDivElement;

    // Drag SE inward by -40 x, -30 y (attempting to shrink below min)
    dispatchMouse(se, "mousedown", { clientX: 200, clientY: 200, button: 0 });
    dispatchMouse(document, "mousemove", { clientX: 160, clientY: 170 });
    dispatchMouse(document, "mouseup", { clientX: 160, clientY: 170 });

    // Allow any trailing rAF/setTimeout work to flush
    await new Promise((r) => setTimeout(r, 0));

    const el = document.getElementById(id)! as HTMLElement;
    const w = parseFloat(el.style.width || "0");
    const h = parseFloat(el.style.height || "0");
    expect(w).toBeGreaterThanOrEqual(80);
    expect(h).toBeGreaterThanOrEqual(30);
  });

  it("disables resizing entirely when data-resize-enabled is false", () => {
    const ctx: any = { payload: {} };
    const template = {
      tag: "div",
      text: "",
      classes: ["rx-comp", "rx-box"],
      css: ".rx-box { background: #eee; }",
      cssVariables: {},
      dimensions: { width: 120, height: 70 },
      attributes: {
        "data-resize-enabled": "false",
        "data-resize-handles": "se",
      },
    } as any;

    createHandlers.resolveTemplate({ component: { template } } as any, ctx);
    createHandlers.createNode({ position: { x: 10, y: 20 } } as any, ctx);

    const id = ctx.payload.nodeId as string;
    const el = document.getElementById(id)! as HTMLElement;

    const conductor = {
      play: (_pluginId: string, seqId: string, payload: any) => {
        if (seqId === "canvas-component-resize-start-symphony") {
          resizeHandlers.startResize?.(payload, {});
        } else if (seqId === "canvas-component-resize-move-symphony") {
          resizeHandlers.updateSize?.(payload, {});
        } else if (seqId === "canvas-component-resize-end-symphony") {
          resizeHandlers.endResize?.(payload, {});
        }
      },
    };

    showSelectionOverlay({ id }, { conductor });
    const overlay = document.getElementById("rx-selection-overlay")! as HTMLDivElement;
    const se = overlay.querySelector(".rx-handle.se")! as HTMLDivElement;

    // Try to resize
    dispatchMouse(se, "mousedown", { clientX: 200, clientY: 200, button: 0 });
    dispatchMouse(document, "mousemove", { clientX: 240, clientY: 240 });
    dispatchMouse(document, "mouseup", { clientX: 240, clientY: 240 });

    // Expect unchanged
    expect(el.style.width).toBe("120px");
    expect(el.style.height).toBe("70px");
  });
});

