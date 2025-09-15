/* @vitest-environment jsdom */
import { describe, it, expect, beforeEach } from "vitest";
import { handlers as createHandlers } from "@renderx-plugins/canvas-component/symphonies/create/create.symphony.ts";
import { showSelectionOverlay } from "@renderx-plugins/canvas-component/symphonies/select/select.stage-crew.ts";

function makeTemplate() {
  return {
    tag: "button",
    text: "Click me",
    classes: ["rx-comp", "rx-button"],
    css: ".rx-button { background: #007acc; color: #fff; }",
    cssVariables: {},
    dimensions: { width: 100, height: 50 },
  } as any;
}

describe("selection overlay CSS ensures box-sizing border-box for accurate alignment", () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="rx-canvas" style="position:relative"></div>';
  });

  it("sets overlay to border-box so its border doesn't expand beyond element bounds", () => {
    const ctx: any = { payload: {} };
    const template = makeTemplate();
    createHandlers.resolveTemplate({ component: { template } }, ctx);
    createHandlers.createNode({ position: { x: 10, y: 20 } }, ctx);

    const id = ctx.payload.nodeId as string;
    const conductor = { play: () => {} } as any;
    showSelectionOverlay({ id }, { conductor });

    const overlay = document.getElementById("rx-selection-overlay") as HTMLDivElement;
    expect(overlay).toBeTruthy();
    expect(overlay.style.boxSizing).toBe("border-box");
  });
});

