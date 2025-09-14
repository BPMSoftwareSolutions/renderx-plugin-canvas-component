/* @vitest-environment jsdom */
import { describe, it, expect, beforeEach } from "vitest";
import { handlers as createHandlers } from "@renderx-plugins/canvas-component/symphonies/create/create.symphony.ts";
import { showSelectionOverlay } from "@renderx-plugins/canvas-component/symphonies/select/select.stage-crew.ts";

describe("selection overlay positions correctly for children inside container", () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="rx-canvas" style="position:relative"></div>';
  });

  it("computes overlay rect from canvas origin when element is container-relative", () => {
    const ctx1: any = { payload: {} };
    // Create container
    const tplContainer = {
      tag: "div",
      classes: ["rx-comp", "rx-container"],
      css: ".rx-container { border: 1px dashed #999; }",
      cssVariables: {},
      dimensions: { width: 300, height: 200 },
      attributes: { "data-role": "container" },
    };
    createHandlers.resolveTemplate({ component: { template: tplContainer } }, ctx1);
    createHandlers.createNode({ position: { x: 100, y: 50 } }, ctx1);
    const containerId = ctx1.payload.nodeId as string;
    const containerEl = document.getElementById(containerId)! as HTMLElement;

    // Mock rects for canvas and container
    const canvas = document.getElementById("rx-canvas")! as HTMLElement;
    (canvas as any).getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 600, right: 800, bottom: 600, x: 0, y: 0, toJSON() {} });
    (containerEl as any).getBoundingClientRect = () => ({ left: 100, top: 50, width: 300, height: 200, right: 400, bottom: 250, x: 100, y: 50, toJSON() {} });

    // Create child at (25,30) relative to container
    const ctx2: any = { payload: {} };
    const tplChild = {
      tag: "button",
      text: "Click",
      classes: ["rx-comp", "rx-button"],
      css: ".rx-button { background: #007acc; color: #fff; }",
      cssVariables: {},
      dimensions: { width: 100, height: 40 },
    };
    createHandlers.resolveTemplate({ component: { template: tplChild } }, ctx2);
    createHandlers.createNode({ position: { x: 25, y: 30 }, containerId }, ctx2);

    const childId = ctx2.payload.nodeId as string;
    const childEl = document.getElementById(childId)! as HTMLElement;

    // Show selection overlay for child (provide minimal conductor)
    showSelectionOverlay({ id: childId }, { conductor: { play: () => {} } as any });

    const overlay = document.getElementById("rx-selection-overlay") as HTMLDivElement;
    expect(overlay).toBeTruthy();

    // Overlay should compute absolute position: container(100,50) + child(25,30) = (125,80)
    expect(overlay.style.left).toBe("125px");
    expect(overlay.style.top).toBe("80px");
    expect(overlay.style.width).toBe(childEl.style.width);
    expect(overlay.style.height).toBe(childEl.style.height);
  });
});

