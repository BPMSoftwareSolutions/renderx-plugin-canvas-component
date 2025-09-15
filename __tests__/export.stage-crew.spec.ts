/* @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { collectLayoutData } from "@renderx-plugins/canvas-component/symphonies/export/export.stage-crew.ts";

function makeCtx() {
  return {
    payload: {
      components: [
        { id: "rx-node-1", type: "button" },
        { id: "rx-node-2", type: "div" },
      ],
    },
    logger: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
  } as any;
}

describe("canvas-component export.stage-crew", () => {
  beforeEach(() => {
    // Set up canvas container
    document.body.innerHTML = '<div id="rx-canvas" style="position: relative;"></div>';
  });

  describe("collectLayoutData", () => {
    it("should collect layout data from DOM elements", () => {
      const ctx = makeCtx();

      // Create test elements in DOM
      const canvas = document.getElementById("rx-canvas")!;

      const button = document.createElement("button");
      button.id = "rx-node-1";
      button.style.position = "absolute";
      button.style.left = "100px";
      button.style.top = "150px";
      button.style.width = "120px";
      button.style.height = "40px";
      canvas.appendChild(button);

      const div = document.createElement("div");
      div.id = "rx-node-2";
      div.style.position = "absolute";
      div.style.left = "200px";
      div.style.top = "250px";
      div.style.width = "200px";
      div.style.height = "100px";
      canvas.appendChild(div);

      collectLayoutData({}, ctx);

      expect(ctx.payload.layoutData).toHaveLength(2);
      expect(ctx.payload.layoutData[0]).toMatchObject({
        id: "rx-node-1",
        x: 100,
        y: 150,
        width: 120,
        height: 40,
      });
      expect(ctx.payload.layoutData[1]).toMatchObject({
        id: "rx-node-2",
        x: 200,
        y: 250,
        width: 200,
        height: 100,
      });
    });

    it("should handle missing DOM elements gracefully", () => {
      const ctx = makeCtx();
      // Components exist in payload but not in DOM

      collectLayoutData({}, ctx);

      expect(ctx.payload.layoutData).toHaveLength(2);
      expect(ctx.payload.layoutData[0]).toMatchObject({
        id: "rx-node-1",
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        missing: true,
      });
    });

    it("should handle missing canvas container", () => {
      const ctx = makeCtx();
      document.body.innerHTML = ""; // Remove canvas

      collectLayoutData({}, ctx);

      expect(ctx.payload.error).toContain("Canvas container not found");
      expect(ctx.payload.layoutData).toEqual([]);
    });

    it("should parse CSS transform values", () => {
      const ctx = makeCtx();
      ctx.payload.components = [{ id: "rx-node-1", type: "button" }];

      const canvas = document.getElementById("rx-canvas")!;
      const button = document.createElement("button");
      button.id = "rx-node-1";
      button.style.transform = "translate(50px, 75px)";
      canvas.appendChild(button);

      collectLayoutData({}, ctx);

      expect(ctx.payload.layoutData[0]).toMatchObject({
        id: "rx-node-1",
        x: 50,
        y: 75,
      });
    });

    it("should collect canvas metadata", () => {
      const ctx = makeCtx();

      const canvas = document.getElementById("rx-canvas")! as HTMLDivElement;
      canvas.style.width = "1200px";
      canvas.style.height = "800px";

      collectLayoutData({}, ctx);

      expect(ctx.payload.canvasMetadata).toMatchObject({
        width: 1200,
        height: 800,
      });
    });

    it("should handle elements with getBoundingClientRect", () => {
      const ctx = makeCtx();
      ctx.payload.components = [{ id: "rx-node-1", type: "button" }];

      const canvas = document.getElementById("rx-canvas")!;
      const button = document.createElement("button");
      button.id = "rx-node-1";

      // Mock getBoundingClientRect
      button.getBoundingClientRect = vi.fn(
        () =>
          ({
            left: 100,
            top: 150,
            width: 120,
            height: 40,
            right: 220,
            bottom: 190,
            x: 100,
            y: 150,
          } as DOMRect)
      );

      canvas.appendChild(button);

      collectLayoutData({}, ctx);

      expect(ctx.payload.layoutData[0]).toMatchObject({
        id: "rx-node-1",
        x: 100,
        y: 150,
        width: 120,
        height: 40,
      });
    });
  });
});

