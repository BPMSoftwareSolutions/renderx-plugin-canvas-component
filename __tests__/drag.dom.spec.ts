/* @vitest-environment jsdom */
import { describe, it, expect, beforeEach } from "vitest";
import { handlers } from "@renderx-plugins/canvas-component/symphonies/drag/drag.stage-crew.ts";

function makeCtx() {
  return { payload: {} } as any;
}

describe("canvas-component drag beat (DOM-only)", () => {
  beforeEach(() => {
    // Host container used by Canvas
    document.body.innerHTML = '<div id="rx-canvas"></div>';
  });

  it("updates element position when dragging", () => {
    const ctx = makeCtx();

    // Create a test element
    const canvas = document.getElementById("rx-canvas")!;
    const testElement = document.createElement("button");
    testElement.id = "rx-node-test123";
    testElement.textContent = "Test Button";
    testElement.style.position = "absolute";
    testElement.style.left = "10px";
    testElement.style.top = "20px";
    canvas.appendChild(testElement);

    // Test position update (the main functionality that remains in the symphony)
    const moveData = {
      event: "canvas:component:drag:move",
      id: "rx-node-test123",
      position: { x: 50, y: 80 },
      delta: { x: 40, y: 60 },
    };

    const moveResult = handlers.updatePosition(moveData, ctx);
    expect(moveResult.success).toBe(true);
    expect(moveResult.elementId).toBe("rx-node-test123");
    expect(moveResult.newPosition).toEqual({ x: 50, y: 80 });

    // Verify DOM was updated
    const updatedElement = document.getElementById("rx-node-test123")!;
    expect(updatedElement.style.left).toBe("50px");
    expect(updatedElement.style.top).toBe("80px");
    expect(updatedElement.style.position).toBe("absolute");
  });

  it("throws error when element not found", () => {
    const ctx = makeCtx();

    const moveData = {
      event: "canvas:component:drag:move",
      id: "non-existent-element",
      position: { x: 50, y: 80 },
    };

    expect(() => {
      handlers.updatePosition(moveData, ctx);
    }).toThrow("Canvas component with id non-existent-element not found");
  });

  it("throws error when missing required data", () => {
    const ctx = makeCtx();

    // Missing position
    expect(() => {
      handlers.updatePosition({ id: "test" }, ctx);
    }).toThrow("Missing required drag data: id and position");

    // Missing id
    expect(() => {
      handlers.updatePosition({ position: { x: 10, y: 20 } }, ctx);
    }).toThrow("Missing required drag data: id and position");
  });

  it("handles string position values", () => {
    const ctx = makeCtx();

    // Create a test element
    const canvas = document.getElementById("rx-canvas")!;
    const testElement = document.createElement("div");
    testElement.id = "rx-node-string-test";
    canvas.appendChild(testElement);

    const moveData = {
      id: "rx-node-string-test",
      position: { x: "100px", y: "200px" },
    };

    const result = handlers.updatePosition(moveData, ctx);
    expect(result.success).toBe(true);

    const updatedElement = document.getElementById("rx-node-string-test")!;
    expect(updatedElement.style.left).toBe("100px");
    expect(updatedElement.style.top).toBe("200px");
  });
});

