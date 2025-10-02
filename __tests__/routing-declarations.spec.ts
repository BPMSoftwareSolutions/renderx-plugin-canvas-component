/* @vitest-environment jsdom */
import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("Routing declarations for drag and resize.move sequences", () => {
  const sequencesDir = path.join(process.cwd(), "json-sequences", "canvas-component");

  it("drag.json should have topicMapping with routeToBase: true", () => {
    const dragJsonPath = path.join(sequencesDir, "drag.json");
    expect(fs.existsSync(dragJsonPath)).toBe(true);

    const dragJson = JSON.parse(fs.readFileSync(dragJsonPath, "utf8"));
    
    expect(dragJson).toHaveProperty("topicMapping");
    expect(dragJson.topicMapping).toHaveProperty("routeToBase", true);
    
    // Verify the structure is intact
    expect(dragJson.pluginId).toBe("CanvasComponentDragPlugin");
    expect(dragJson.id).toBe("canvas-component-drag-symphony");
    expect(dragJson.name).toBe("Canvas Component Drag");
    expect(dragJson.movements).toBeInstanceOf(Array);
    expect(dragJson.movements).toHaveLength(1);
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

  it("drag.json should have correct movement structure with handlers", () => {
    const dragJsonPath = path.join(sequencesDir, "drag.json");
    const dragJson = JSON.parse(fs.readFileSync(dragJsonPath, "utf8"));
    
    const movement = dragJson.movements[0];
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
    const dragJsonPath = path.join(sequencesDir, "drag.json");
    const resizeMoveJsonPath = path.join(sequencesDir, "resize.move.json");

    // Should not throw when parsing
    expect(() => JSON.parse(fs.readFileSync(dragJsonPath, "utf8"))).not.toThrow();
    expect(() => JSON.parse(fs.readFileSync(resizeMoveJsonPath, "utf8"))).not.toThrow();
  });

  it("should simulate topic routing behavior with routeToBase flag", () => {
    // This test simulates how the host system would process the topicMapping
    const dragJsonPath = path.join(sequencesDir, "drag.json");
    const resizeMoveJsonPath = path.join(sequencesDir, "resize.move.json");

    const dragJson = JSON.parse(fs.readFileSync(dragJsonPath, "utf8"));
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
    const dragRoutedTopic = simulateRouting(dragJson, dragRequestedTopic);
    expect(dragRoutedTopic).toBe("canvas.component.drag.move");

    // Test resize.move routing
    const resizeRequestedTopic = "canvas.component.resize.move.requested";
    const resizeRoutedTopic = simulateRouting(resizeMoveJson, resizeRequestedTopic);
    expect(resizeRoutedTopic).toBe("canvas.component.resize.move");
  });
});
