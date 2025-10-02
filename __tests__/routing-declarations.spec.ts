/* @vitest-environment jsdom */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("Routing declarations for drag and resize.move sequences", () => {
  const sequencesDir = path.join(process.cwd(), "json-sequences", "canvas-component");

  it("drag.move.json should have topicMapping with routeToBase: true", () => {
    const dragMoveJsonPath = path.join(sequencesDir, "drag.move.json");
    expect(fs.existsSync(dragMoveJsonPath)).toBe(true);

    const dragMoveJson = JSON.parse(fs.readFileSync(dragMoveJsonPath, "utf8"));

    expect(dragMoveJson).toHaveProperty("topicMapping");
    expect(dragMoveJson.topicMapping).toHaveProperty("routeToBase", true);

    // Verify the structure is intact
    expect(dragMoveJson.pluginId).toBe("CanvasComponentDragMovePlugin");
    expect(dragMoveJson.id).toBe("canvas-component-drag-move-symphony");
    expect(dragMoveJson.name).toBe("Canvas Component Drag Move");
    expect(dragMoveJson.movements).toBeInstanceOf(Array);
    expect(dragMoveJson.movements).toHaveLength(1);
  });

  it("resize.move.json should have topicMapping with routeToBase: true", () => {
    const resizeMoveJsonPath = path.join(sequencesDir, "resize.move.json");
    expect(fs.existsSync(resizeMoveJsonPath)).toBe(true);

    const resizeMoveJson = JSON.parse(fs.readFileSync(resizeMoveJsonPath, "utf8"));
    
    expect(resizeMoveJson).toHaveProperty("topicMapping");
    expect(resizeMoveJson.topicMapping).toHaveProperty("routeToBase", true);
    
    // Verify the structure is intact
    expect(resizeMoveJson.pluginId).toBe("CanvasComponentResizeMovePlugin");
    expect(resizeMoveJson.id).toBe("canvas-component-resize-move-symphony");
    expect(resizeMoveJson.name).toBe("Canvas Component Resize Move");
    expect(resizeMoveJson.movements).toBeInstanceOf(Array);
    expect(resizeMoveJson.movements).toHaveLength(1);
  });

  it("drag.move.json should have correct movement structure with handlers", () => {
    const dragMoveJsonPath = path.join(sequencesDir, "drag.move.json");
    const dragMoveJson = JSON.parse(fs.readFileSync(dragMoveJsonPath, "utf8"));

    const movement = dragMoveJson.movements[0];
    expect(movement.id).toBe("drag-move");
    expect(movement.name).toBe("Drag Move");
    expect(movement.beats).toHaveLength(2);

    // Verify handlers are correctly mapped
    expect(movement.beats[0].handler).toBe("updatePosition");
    expect(movement.beats[1].handler).toBe("forwardToControlPanel");
  });

  it("resize.move.json should have correct movement structure with handlers", () => {
    const resizeMoveJsonPath = path.join(sequencesDir, "resize.move.json");
    const resizeMoveJson = JSON.parse(fs.readFileSync(resizeMoveJsonPath, "utf8"));
    
    const movement = resizeMoveJson.movements[0];
    expect(movement.id).toBe("resize-move");
    expect(movement.name).toBe("Resize Move");
    expect(movement.beats).toHaveLength(2);
    
    // Verify handlers are correctly mapped
    expect(movement.beats[0].handler).toBe("updateSize");
    expect(movement.beats[1].handler).toBe("forwardToControlPanel");
  });

  it("should validate JSON structure is valid", () => {
    const dragMoveJsonPath = path.join(sequencesDir, "drag.move.json");
    const resizeMoveJsonPath = path.join(sequencesDir, "resize.move.json");

    // Should not throw when parsing
    expect(() => JSON.parse(fs.readFileSync(dragMoveJsonPath, "utf8"))).not.toThrow();
    expect(() => JSON.parse(fs.readFileSync(resizeMoveJsonPath, "utf8"))).not.toThrow();
  });

  it("should simulate topic routing behavior with routeToBase flag", () => {
    // This test simulates how the host system would process the topicMapping
    const dragMoveJsonPath = path.join(sequencesDir, "drag.move.json");
    const resizeMoveJsonPath = path.join(sequencesDir, "resize.move.json");

    const dragMoveJson = JSON.parse(fs.readFileSync(dragMoveJsonPath, "utf8"));
    const resizeMoveJson = JSON.parse(fs.readFileSync(resizeMoveJsonPath, "utf8"));

    // Simulate the routing logic that would be used by the host system
    const simulateRouting = (sequenceConfig: any, requestedTopic: string) => {
      if (sequenceConfig.topicMapping?.routeToBase === true) {
        // Remove .requested suffix to get base topic
        return requestedTopic.replace('.requested', '');
      }
      return requestedTopic;
    };

    // Test drag routing
    const dragRequestedTopic = "canvas.component.drag.move.requested";
    const dragRoutedTopic = simulateRouting(dragMoveJson, dragRequestedTopic);
    expect(dragRoutedTopic).toBe("canvas.component.drag.move");

    // Test resize.move routing
    const resizeRequestedTopic = "canvas.component.resize.move.requested";
    const resizeRoutedTopic = simulateRouting(resizeMoveJson, resizeRequestedTopic);
    expect(resizeRoutedTopic).toBe("canvas.component.resize.move");
  });

  it("should have drag.start.json and drag.end.json sequence files", () => {
    const dragStartJsonPath = path.join(sequencesDir, "drag.start.json");
    const dragEndJsonPath = path.join(sequencesDir, "drag.end.json");

    expect(fs.existsSync(dragStartJsonPath)).toBe(true);
    expect(fs.existsSync(dragEndJsonPath)).toBe(true);

    const dragStartJson = JSON.parse(fs.readFileSync(dragStartJsonPath, "utf8"));
    const dragEndJson = JSON.parse(fs.readFileSync(dragEndJsonPath, "utf8"));

    // Verify drag.start.json structure
    expect(dragStartJson.pluginId).toBe("CanvasComponentDragStartPlugin");
    expect(dragStartJson.id).toBe("canvas-component-drag-start-symphony");
    expect(dragStartJson.name).toBe("Canvas Component Drag Start");
    expect(dragStartJson.movements[0].beats[0].handler).toBe("startDrag");

    // Verify drag.end.json structure
    expect(dragEndJson.pluginId).toBe("CanvasComponentDragEndPlugin");
    expect(dragEndJson.id).toBe("canvas-component-drag-end-symphony");
    expect(dragEndJson.name).toBe("Canvas Component Drag End");
    expect(dragEndJson.movements[0].beats[0].handler).toBe("endDrag");
  });
});
