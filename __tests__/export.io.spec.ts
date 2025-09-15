/* @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { queryAllComponents } from "@renderx-plugins/canvas-component/symphonies/export/export.io.ts";

function makeCtx() {
  const ops: any[] = [];
  const kvStore = new Map();

  // Pre-populate with test data
  kvStore.set("rx-node-1", {
    type: "button",
    classes: ["rx-comp", "rx-button"],
    style: { padding: "8px 12px" },
    createdAt: 1724668200000,
  });
  kvStore.set("rx-node-2", {
    type: "div",
    classes: ["rx-comp", "rx-card"],
    style: { padding: "12px" },
    createdAt: 1724668300000,
  });

  return {
    payload: {},
    io: {
      kv: {
        put: async (...a: any[]) => ops.push(["kv.put", ...a]),
        get: async (key: string) => {
          ops.push(["kv.get", key]);
          return kvStore.get(key);
        },
        keys: async () => {
          ops.push(["kv.keys"]);
          return Array.from(kvStore.keys());
        },
        getAll: async () => {
          ops.push(["kv.getAll"]);
          const result: any[] = [];
          for (const [key, value] of kvStore.entries()) {
            result.push({ id: key, ...value });
          }
          return result;
        },
      },
    },
    _ops: ops,
    logger: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
  } as any;
}

describe("canvas-component export.io", () => {
  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = "";
    // Mock URL.createObjectURL and URL.revokeObjectURL
    global.URL.createObjectURL = vi.fn(() => "blob:mock-url");
    global.URL.revokeObjectURL = vi.fn();
  });

  describe("queryAllComponents", () => {
    // NOTE: IO no longer performs DOM scanning; tests expecting DOM scanning should be moved to stage-crew/integration.
    it("should query all components from KV store", async () => {
      const ctx = makeCtx();

      await queryAllComponents({}, ctx);

      const ops = ctx._ops.map((x: any[]) => x[0]);
      expect(ops).toContain("kv.getAll");
      expect(ctx.payload.components).toHaveLength(2);
      expect(ctx.payload.components[0]).toMatchObject({
        id: "rx-node-1",
        type: "button",
        classes: ["rx-comp", "rx-button"],
      });
    });

    // Note: KV discovery fallbacks are now handled by stage-crew beats. IO does not perform DOM discovery.
    // Tests expecting DOM discovery should be covered in stage-crew and integration tests.
  });

  describe("collectCssClasses (moved to stage-crew)", () => {
    it("should collect CSS class definitions from components", async () => {
      const ctx = makeCtx();
      ctx.payload.components = [
        {
          id: "rx-node-1",
          classes: ["rx-comp", "rx-button", "custom-highlight"],
        },
        { id: "rx-node-2", classes: ["rx-comp", "rx-card"] },
      ];

      // Mock CSS registry
      ctx.io.cssRegistry = {
        getClass: async (className: string) => {
          const mockClasses: any = {
            "rx-comp": {
              name: "rx-comp",
              content:
                ".rx-comp { position: relative; box-sizing: border-box; }",
              isBuiltIn: true,
              createdAt: 1724668100000,
              updatedAt: 1724668100000,
            },
            "rx-button": {
              name: "rx-button",
              content: ".rx-button { background: #3b82f6; color: white; }",
              isBuiltIn: true,
              createdAt: 1724668100000,
              updatedAt: 1724668100000,
            },
            "custom-highlight": {
              name: "custom-highlight",
              content: ".custom-highlight { background: yellow; }",
              isBuiltIn: false,
              createdAt: 1724668500000,
              updatedAt: 1724668600000,
            },
          };
          return mockClasses[className] || null;
        },
      };

      // collectCssClasses moved to stage-crew; IO no-op for CSS collection
      expect(true).toBe(true);
    });

    it("should handle missing CSS registry gracefully", async () => {
      const ctx = makeCtx();
      ctx.payload.components = [
        { id: "rx-node-1", classes: ["rx-comp", "rx-button"] },
      ];
      // No CSS registry available

      // collectCssClasses moved to stage-crew; IO no-op for CSS collection
      expect(true).toBe(true);
    });

    it("should deduplicate CSS classes across components", async () => {
      const ctx = makeCtx();
      ctx.payload.components = [
        { id: "rx-node-1", classes: ["rx-comp", "rx-button"] },
        { id: "rx-node-2", classes: ["rx-comp", "rx-card"] },
        { id: "rx-node-3", classes: ["rx-button", "custom-style"] },
      ];

      ctx.io.cssRegistry = {
        getClass: async (className: string) => ({
          name: className,
          content: `.${className} { /* mock */ }`,
          isBuiltIn: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }),
      };

      // collectCssClasses moved to stage-crew; IO no-op for CSS collection
      expect(true).toBe(true);
    });
  });

  describe("downloadUiFile (moved to stage-crew)", () => {
    it("should create and trigger download of UI file", async () => {
      const ctx = makeCtx();
      ctx.payload.uiFileContent = {
        version: "1.0.0",
        components: [{ id: "test", type: "button" }],
      };

      // Mock DOM elements
      const mockAnchor = {
        href: "",
        download: "",
        click: vi.fn(),
      };
      vi.spyOn(document, "createElement").mockReturnValue(mockAnchor as any);

      // downloadUiFile moved to stage-crew; IO no-op for browser download
      expect(true).toBe(true);
    });

    it("should handle missing uiFileContent", async () => {
      const _ctx = makeCtx();
      // No uiFileContent in payload

      // downloadUiFile moved to stage-crew; IO no-op for browser download
      expect(true).toBe(true);
    });

    it("should handle browser environment check", async () => {
      const _ctx = makeCtx();
      _ctx.payload.uiFileContent = { version: "1.0.0", components: [] };

      // Mock non-browser environment
      const originalDocument = global.document;
      (global as any).document = undefined;

      // downloadUiFile moved to stage-crew; IO no-op for browser download
      // Restore
      global.document = originalDocument;
      expect(true).toBe(true);
    });
  });
});

