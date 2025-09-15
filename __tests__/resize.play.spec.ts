import { vi } from "vitest";
vi.mock("@renderx-plugins/host-sdk", async (orig) => {
  const actual = await (orig as any).importActual?.("@renderx-plugins/host-sdk");
  return {
    ...actual,
    EventRouter: {
      publish: (key: string, payload: any, conductor?: any) => {
        if (conductor?.play) {
          try {
            const route = (actual as any).resolveInteraction?.(key) ?? { pluginId: "noop", sequenceId: key };
            conductor.play(route.pluginId, route.sequenceId, payload);
          } catch {}
        }
      },
    },
  } as any;
});

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

function dispatchMouse(el: Element | Document, type: string, opts: any) {
  const ev = new MouseEvent(type, { bubbles: true, cancelable: true, ...opts });
  (el as any).dispatchEvent(ev);
}

describe("canvas-component resize via conductor.play", () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="rx-canvas" style="position:relative"></div>';
  });

  it.skip("should keep the resized width/height after mouseup (no snap back)", () => {
    const ctx: any = { payload: {} };
    const template = makeTemplate();
    createHandlers.resolveTemplate({ component: { template } }, ctx);
    createHandlers.createNode({ position: { x: 10, y: 20 } }, ctx);

    const id = ctx.payload.nodeId;
    const el = document.getElementById(id)! as HTMLElement;

    const conductor = {
      play: (_pluginId: string, _seqId: string, payload: any) => {
        try { (resizeHandlers as any).startResize?.(payload, {}); } catch {}
        try { (resizeHandlers as any).updateSize?.(payload, {}); } catch {}
        try { (resizeHandlers as any).endResize?.(payload, {}); } catch {}
      },
    };

    showSelectionOverlay({ id }, { conductor });

    const overlay = document.getElementById("rx-selection-overlay")!;
    const se = overlay.querySelector(".rx-handle.se")!;

    expect(el.style.width).toBe("100px");
    expect(el.style.height).toBe("50px");

    dispatchMouse(se, "mousedown", { clientX: 200, clientY: 200, button: 0 });
    dispatchMouse(document, "mousemove", { clientX: 220, clientY: 230 });

    expect(el.style.width).toBe("120px");
    expect(el.style.height).toBe("80px");

    dispatchMouse(document, "mouseup", { clientX: 220, clientY: 230 });

    expect(el.style.width).toBe("120px");
    expect(el.style.height).toBe("80px");
  });
});

