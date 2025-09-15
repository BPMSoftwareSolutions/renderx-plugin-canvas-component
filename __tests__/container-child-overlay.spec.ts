/* @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock host SDK to provide conductor functionality
vi.mock("@renderx-plugins/host-sdk", () => ({
  useConductor: () => ({ play: vi.fn() }),
  isFlagEnabled: () => false,
  resolveInteraction: (key: string) => ({ pluginId: "test", sequenceId: key }),
  EventRouter: { publish: vi.fn() },
}));

import { handlers as createHandlers } from "@renderx-plugins/canvas-component/symphonies/create/create.symphony.ts";
import { showSelectionOverlay } from "@renderx-plugins/canvas-component/symphonies/select/select.stage-crew.ts";

function makeContainerTemplate() {
  return {
    tag: "div",
    text: "",
    classes: ["rx-comp", "rx-container"],
    css: ".rx-container { background: #f0f0f0; border: 2px dashed #ccc; }",
    cssVariables: {},
    dimensions: { width: 200, height: 150 },
    attributes: { "data-role": "container" },
  } as const;
}

function makeChildTemplate() {
  return {
    tag: "button",
    text: "Child Button",
    classes: ["rx-comp", "rx-button"],
    css: ".rx-button { background: #007acc; color: #fff; }",
    cssVariables: {},
    dimensions: { width: 100, height: 40 },
  } as const;
}

describe("Container child overlay positioning issues (migrated)", () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="rx-canvas" style="position:relative"></div>';
  });


  // Ensure conductor exists for overlay logic that depends on useConductor()
  beforeEach(async () => {
    const { initConductor } = await import("../src/temp-deps/conductor");
    await initConductor();
  });

  it("positions overlay over child when child is clicked (absolute to canvas)", () => {
    const containerSelectedSpy = vi.fn();
    const childSelectedSpy = vi.fn();

    // Create container at (50, 50) with 200x150 size
    const ctx1 = { payload: {} } as any;
    createHandlers.resolveTemplate(
      { component: { template: makeContainerTemplate() } },
      ctx1
    );
    createHandlers.createNode(
      {
        position: { x: 50, y: 50 },
        onSelected: (data: any) => {
          containerSelectedSpy(data);
          showSelectionOverlay({ id: data.id });
        },
      },
      ctx1
    );

    const containerId = ctx1.payload.nodeId as string;
    const containerEl = document.getElementById(containerId)! as HTMLElement;

    // Mock rects for canvas and container so absolute calcs work in jsdom
    const canvas = document.getElementById("rx-canvas")! as HTMLElement;
    (canvas as any).getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      width: 800,
      height: 600,
      right: 800,
      bottom: 600,
      x: 0,
      y: 0,
      toJSON() {},
    });
    (containerEl as any).getBoundingClientRect = () => ({
      left: 50,
      top: 50,
      width: 200,
      height: 150,
      right: 250,
      bottom: 200,
      x: 50,
      y: 50,
      toJSON() {},
    });

    // Create child at (25, 30) relative to container
    const ctx2 = { payload: {} } as any;
    createHandlers.resolveTemplate(
      { component: { template: makeChildTemplate() } },
      ctx2
    );
    createHandlers.createNode(
      {
        position: { x: 25, y: 30 },
        containerId,
        onSelected: (data: any) => {
          childSelectedSpy(data);
          showSelectionOverlay({ id: data.id });
        },
      },
      ctx2
    );

    const childId = ctx2.payload.nodeId as string;
    const childEl = document.getElementById(childId)! as HTMLElement;

    // Click child
    const clickEvent = new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
    });
    childEl.dispatchEvent(clickEvent);

    // Get the selection overlay
    const overlay = document.getElementById("rx-selection-overlay") as HTMLDivElement;
    expect(overlay).toBeTruthy();

    // Overlay should compute absolute position: container(50,50) + child(25,30) = (75,80)
    expect(overlay.style.left).toBe("75px");
    expect(overlay.style.top).toBe("80px");
    expect(overlay.style.width).toBe("100px");
    expect(overlay.style.height).toBe("40px");
  });

  it.skip("overlay should track child element during drag, not container (known issue)", () => {
    // Keeping this as a skipped test to document the current bug and drive a future fix
  });

  it("documents current overlay behavior for debugging", () => {
    const ctx1 = { payload: {} } as any;
    createHandlers.resolveTemplate(
      { component: { template: makeContainerTemplate() } },
      ctx1
    );
    createHandlers.createNode({ position: { x: 50, y: 50 } }, ctx1);

    const containerId = ctx1.payload.nodeId as string;

    const ctx2 = { payload: {} } as any;
    createHandlers.resolveTemplate(
      { component: { template: makeChildTemplate() } },
      ctx2
    );
    createHandlers.createNode(
      { position: { x: 25, y: 30 }, containerId },
      ctx2
    );

    const childId = ctx2.payload.nodeId as string;

    showSelectionOverlay({ id: childId });
    const overlay = document.getElementById("rx-selection-overlay") as HTMLDivElement;

    expect(overlay).toBeTruthy();
    expect(overlay.dataset.targetId).toBe(childId);
  });
});

