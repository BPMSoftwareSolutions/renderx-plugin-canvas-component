import { describe, it, expect, vi } from "vitest";
import { buildUiFileContent } from "@renderx-plugins/canvas-component/symphonies/export/export.pure.ts";

function makeCtx() {
  return {
    payload: {
      components: [
        {
          id: "rx-node-1",
          type: "button",
          classes: ["rx-comp", "rx-button"],
          style: { padding: "8px 12px", borderRadius: "8px" },
          createdAt: 1724668200000,
        },
        {
          id: "rx-node-2",
          type: "div",
          classes: ["rx-comp", "rx-card"],
          style: { padding: "12px", boxShadow: "0 2px 8px rgba(0,0,0,.1)" },
          createdAt: 1724668300000,
        },
      ],
      layoutData: [
        { id: "rx-node-1", x: 100, y: 150, width: 120, height: 40 },
        { id: "rx-node-2", x: 200, y: 250, width: 200, height: 100 },
      ],
      canvasMetadata: {
        width: 1200,
        height: 800,
      },
    },
    logger: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
  } as any;
}

describe("canvas-component export.pure", () => {
  describe("buildUiFileContent", () => {
    it("should build complete UI file content with CSS classes section", () => {
      const ctx = makeCtx();
      // Add CSS class definitions to payload (simulating what the IO handler would provide)
      ctx.payload.cssClasses = {
        "rx-comp": {
          name: "rx-comp",
          content: ".rx-comp { position: relative; box-sizing: border-box; }",
          isBuiltIn: true,
          createdAt: 1724668100000,
          updatedAt: 1724668100000,
        },
        "rx-button": {
          name: "rx-button",
          content:
            ".rx-button { background: #3b82f6; color: white; padding: 12px 24px; }",
          isBuiltIn: true,
          createdAt: 1724668100000,
          updatedAt: 1724668100000,
        },
        "rx-card": {
          name: "rx-card",
          content:
            ".rx-card { background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,.1); }",
          isBuiltIn: true,
          createdAt: 1724668100000,
          updatedAt: 1724668100000,
        },
      };

      buildUiFileContent({}, ctx);

      expect(ctx.payload.uiFileContent).toMatchObject({
        version: "1.0.1",
        metadata: {
          createdAt: expect.any(String),
          canvasSize: { width: 1200, height: 800 },
        },
        cssClasses: {
          "rx-comp": {
            name: "rx-comp",
            content: ".rx-comp { position: relative; box-sizing: border-box; }",
            isBuiltIn: true,
            createdAt: 1724668100000,
            updatedAt: 1724668100000,
          },
          "rx-button": {
            name: "rx-button",
            content:
              ".rx-button { background: #3b82f6; color: white; padding: 12px 24px; }",
            isBuiltIn: true,
            createdAt: 1724668100000,
            updatedAt: 1724668100000,
          },
          "rx-card": {
            name: "rx-card",
            content:
              ".rx-card { background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,.1); }",
            isBuiltIn: true,
            createdAt: 1724668100000,
            updatedAt: 1724668100000,
          },
        },
        components: [
          {
            id: "rx-node-1",
            type: "button",
            template: {
              tag: "button",
              classRefs: ["rx-comp", "rx-button"],
              style: { padding: "8px 12px", borderRadius: "8px" },
            },
            layout: { x: 100, y: 150, width: 120, height: 40 },
            createdAt: 1724668200000,
          },
          {
            id: "rx-node-2",
            type: "div",
            template: {
              tag: "div",
              classRefs: ["rx-comp", "rx-card"],
              style: { padding: "12px", boxShadow: "0 2px 8px rgba(0,0,0,.1)" },
            },
            layout: { x: 200, y: 250, width: 200, height: 100 },
            createdAt: 1724668300000,
          },
        ],
      });
    });

    it("should handle missing layout data gracefully", () => {
      const ctx = makeCtx();
      ctx.payload.layoutData = [
        { id: "rx-node-1", x: 100, y: 150, width: 120, height: 40 },
        // Missing layout for rx-node-2
      ];

      buildUiFileContent({}, ctx);

      const components = ctx.payload.uiFileContent.components;
      expect(components).toHaveLength(2);
      expect(components[1].layout).toEqual({ x: 0, y: 0, width: 0, height: 0 });
    });

    it("should handle missing components gracefully", () => {
      const ctx = makeCtx();
      ctx.payload.components = [];
      ctx.payload.layoutData = [];

      buildUiFileContent({}, ctx);

      expect(ctx.payload.uiFileContent.components).toEqual([]);
      expect(ctx.payload.uiFileContent.metadata.componentCount).toBe(0);
    });

    it("should include canvas metadata", () => {
      const ctx = makeCtx();

      buildUiFileContent({}, ctx);

      expect(ctx.payload.uiFileContent.metadata).toMatchObject({
        canvasSize: { width: 1200, height: 800 },
        componentCount: 2,
        createdAt: expect.any(String),
      });
    });

    it("should handle missing canvas metadata", () => {
      const ctx = makeCtx();
      delete ctx.payload.canvasMetadata;

      buildUiFileContent({}, ctx);

      expect(ctx.payload.uiFileContent.metadata.canvasSize).toEqual({
        width: 0,
        height: 0,
      });
    });

    it("should preserve component creation timestamps", () => {
      const ctx = makeCtx();

      buildUiFileContent({}, ctx);

      const components = ctx.payload.uiFileContent.components;
      expect(components[0].createdAt).toBe(1724668200000);
      expect(components[1].createdAt).toBe(1724668300000);
    });

    it("should map component types to template tags correctly", () => {
      const ctx = makeCtx();
      ctx.payload.components = [
        { id: "rx-node-1", type: "button", classes: [], style: {} },
        { id: "rx-node-2", type: "input", classes: [], style: {} },
        { id: "rx-node-3", type: "container", classes: [], style: {} },
      ];
      ctx.payload.layoutData = [
        { id: "rx-node-1", x: 0, y: 0, width: 0, height: 0 },
        { id: "rx-node-2", x: 0, y: 0, width: 0, height: 0 },
        { id: "rx-node-3", x: 0, y: 0, width: 0, height: 0 },
      ];

      buildUiFileContent({}, ctx);

      const components = ctx.payload.uiFileContent.components;
      expect(components[0].template.tag).toBe("button");
      expect(components[1].template.tag).toBe("input");
      expect(components[2].template.tag).toBe("div"); // container maps to div
    });

    it("should generate valid ISO timestamp", () => {
      const ctx = makeCtx();

      buildUiFileContent({}, ctx);

      const timestamp = ctx.payload.uiFileContent.metadata.createdAt;
      expect(timestamp).toMatch(/^^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$$/);
      expect(new Date(timestamp).getTime()).toBeGreaterThan(0);
    });
  });
});

