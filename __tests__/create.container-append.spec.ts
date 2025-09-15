/* @vitest-environment jsdom */
import { describe, it, expect, beforeEach } from "vitest";
import { handlers as createHandlers } from "@renderx-plugins/canvas-component/symphonies/create/create.symphony.ts";

function makeContainerTemplate() {
  return {
    tag: "div",
    text: undefined,
    classes: ["rx-comp", "rx-container"],
    css: ".rx-container { border: 1px dashed #999; }",
    cssVariables: {},
    dimensions: { width: 300, height: 200 },
    attributes: { "data-role": "container" },
  };
}

function makeChildTemplate() {
  return {
    tag: "button",
    text: "Click",
    classes: ["rx-comp", "rx-button"],
    css: ".rx-button { background: #007acc; color: #fff; }",
    cssVariables: {},
    dimensions: { width: 100, height: 40 },
  };
}

describe("create: appends under container when containerId provided", () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="rx-canvas" style="position:relative"></div>';
  });

  it("creates container and then child inside it with relative positioning", () => {
    const ctx1: any = { payload: {} };
    const tplContainer = makeContainerTemplate();
    createHandlers.resolveTemplate({ component: { template: tplContainer } }, ctx1);
    createHandlers.createNode({ position: { x: 10, y: 20 } }, ctx1);

    const containerId = ctx1.payload.nodeId as string;
    const containerEl = document.getElementById(containerId)! as HTMLElement;
    expect(containerEl.dataset.role).toBe("container");

    const ctx2: any = { payload: {} };
    const tplChild = makeChildTemplate();
    createHandlers.resolveTemplate({ component: { template: tplChild } }, ctx2);
    createHandlers.createNode({ position: { x: 25, y: 30 }, containerId }, ctx2);

    const childId = ctx2.payload.nodeId as string;
    const childEl = document.getElementById(childId)! as HTMLElement;

    // Assert parent-child relationship
    expect(childEl.parentElement).toBe(containerEl);

    // Assert child is positioned relative to container
    expect(childEl.style.left).toBe("25px");
    expect(childEl.style.top).toBe("30px");
  });
});

