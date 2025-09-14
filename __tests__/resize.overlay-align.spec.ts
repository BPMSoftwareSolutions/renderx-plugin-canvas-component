/* @vitest-environment jsdom */
import { describe, it, expect, beforeEach } from "vitest";
import { handlers as createHandlers } from "@renderx-plugins/canvas-component/symphonies/create/create.symphony.ts";
import { showSelectionOverlay } from "@renderx-plugins/canvas-component/symphonies/select/select.stage-crew.ts";
import { handlers as resizeHandlers } from "@renderx-plugins/canvas-component/symphonies/resize/resize.symphony.ts";

function makeTemplate() {
  return {
    tag: "button",
    text: "Click me",
    classes: ["rx-comp", "rx-button"],
    css: ".rx-button { background: #007acc; color: #fff; }",
    cssVariables: {},
    dimensions: { width: 100, height: 50 },
  };
}

function dispatchMouse(el: Element, type: string, opts: any) {
  const ev = new MouseEvent(type, { bubbles: true, cancelable: true, ...opts });
  (el as any).dispatchEvent(ev);
}

describe("selection overlay remains aligned with component after resize (conductor)", () => {
  beforeEach(() => {
    document.body.innerHTML =
      '<div id="rx-canvas" style="position:relative"></div>';
  });

  it("keeps overlay aligned with element's width/height after dragging SE handle", () => {
    const ctx: any = { payload: {} };
    const template = makeTemplate();
    createHandlers.resolveTemplate({ component: { template } }, ctx);
    createHandlers.createNode({ position: { x: 10, y: 20 } }, ctx);

    const id = ctx.payload.nodeId;
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

    const overlay = document.getElementById(
      "rx-selection-overlay"
    ) as HTMLDivElement;
    const se = overlay.querySelector(".rx-handle.se")!;

    // drag to resize: +30 width, +20 height
    dispatchMouse(se, "mousedown", { clientX: 200, clientY: 200, button: 0 });
    document.dispatchEvent(
      new MouseEvent("mousemove", { clientX: 230, clientY: 220, bubbles: true })
    );
    document.dispatchEvent(
      new MouseEvent("mouseup", { clientX: 230, clientY: 220, bubbles: true })
    );

    // Desired: overlay style matches element style
    expect(overlay.style.width).toBe(el.style.width);
    expect(overlay.style.height).toBe(el.style.height);
    expect(overlay.style.left).toBe(el.style.left);
    expect(overlay.style.top).toBe(el.style.top);
  });
});

