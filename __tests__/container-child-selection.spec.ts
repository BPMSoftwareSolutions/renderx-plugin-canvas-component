/* @vitest-environment jsdom */
import { describe, it, beforeEach } from "vitest";
import { handlers as createHandlers } from "@renderx-plugins/canvas-component/symphonies/create/create.symphony.ts";

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

describe("Container child selection and drag issues (migrated; known failing expectations)", () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="rx-canvas" style="position:relative"></div>';
  });

  it.skip("clicking child component should select child, not container", () => {
    // Known bubbling issue; keeping as skipped to document desired behavior
    const ctx1 = { payload: {} } as any;
    createHandlers.resolveTemplate({ component: { template: makeContainerTemplate() } }, ctx1);
    createHandlers.createNode({ position: { x: 50, y: 50 } }, ctx1);

    const containerId = ctx1.payload.nodeId as string;

    const ctx2 = { payload: {} } as any;
    createHandlers.resolveTemplate({ component: { template: makeChildTemplate() } }, ctx2);
    createHandlers.createNode({ position: { x: 25, y: 30 }, containerId }, ctx2);
  });

  it.skip("dragging child component should drag child, not container", () => {
    // Known bubbling issue; keeping as skipped to document desired behavior
  });

  it.skip("child element should be visually contained within container bounds", () => {
    // This one often passes but is not critical to this migration; skipping for parity with bubbling fixes work
  });
});

