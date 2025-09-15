import { vi } from "vitest";
vi.mock("@renderx-plugins/host-sdk", async (orig) => {
  const actual = await (orig as any).importActual?.("@renderx-plugins/host-sdk");
  return {
    ...actual,
    EventRouter: {
      publish: (key: string, payload: any, conductor?: any) => {
        // Drive conductor directly in tests to avoid no-op host router
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
import { handlers } from "@renderx-plugins/canvas-component/symphonies/create/create.symphony.ts";
import { showSelectionOverlay } from "@renderx-plugins/canvas-component/symphonies/select/select.stage-crew.ts";
import { handlers as resizeHandlers } from "@renderx-plugins/canvas-component/symphonies/resize/resize.stage-crew.ts";

function makeTemplate() {
  return {
    tag: "div",
    text: "",
    classes: ["rx-comp", "rx-box"],
    css: ".rx-box { background: #eee; }",
    cssVariables: {},
    dimensions: { width: 100, height: 50 },
  };
}

function makeCtx() {
  return { payload: {} } as any;
}

function dispatchMouse(el: Element | Document, type: string, opts: any) {
  const ev = new MouseEvent(type, { bubbles: true, cancelable: true, ...opts });
  (el as any).dispatchEvent(ev);
}

describe("canvas-component resize (DOM-only)", () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="rx-canvas" style="position:relative"></div>';
  });

  it.skip("resizes the element via SE handle drag", () => {
    const ctx: any = makeCtx();
    const template = makeTemplate();

    handlers.resolveTemplate({ component: { template } } as any, ctx);
    handlers.createNode({ position: { x: 10, y: 20 } } as any, ctx);

    const id = ctx.payload.nodeId;
    const el = document.getElementById(id)!;

    // Mock conductor for resize operations
    const conductor = {
      play: (_pluginId: string, _seqId: string, payload: any) => {
        // Update DOM via resize handler
        resizeHandlers.updateSize?.(payload, {});
      },
    };

    // Show overlay (creates handles)
    showSelectionOverlay({ id }, { conductor });

    const overlay = document.getElementById("rx-selection-overlay")!;
    const se = overlay.querySelector(".rx-handle.se")!;

    // initial size
    expect((el as HTMLElement).style.width).toBe("100px");
    expect((el as HTMLElement).style.height).toBe("50px");

    // Start drag near bottom-right
    dispatchMouse(se, "mousedown", { clientX: 200, clientY: 200, button: 0 });
    // Move mouse by +20,+30
    dispatchMouse(document, "mousemove", { clientX: 220, clientY: 230 });
    // End
    dispatchMouse(document, "mouseup", { clientX: 220, clientY: 230 });

    expect((el as HTMLElement).style.width).toBe("120px");
    expect((el as HTMLElement).style.height).toBe("80px");
  });
});

