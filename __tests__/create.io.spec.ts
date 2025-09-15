import { describe, it, expect } from "vitest";
import { registerInstance } from "@renderx-plugins/canvas-component/symphonies/create/create.io.ts";

describe("canvas-component create.io", () => {
  function makeCtx() {
    const ops: any[] = [];
    return {
      payload: {
        nodeId: "rx-node-abc123",
        template: { tag: "button", classes: ["rx-button"], style: {} },
      },
      io: {
        kv: { put: async (...a: any[]) => ops.push(["kv.put", ...a]) },
        cache: { put: async (...a: any[]) => ops.push(["cache.put", ...a]) },
      },
      _ops: ops,
    } as any;
  }

  it("persists node metadata to KV/cache", async () => {
    const ctx: any = makeCtx();
    await registerInstance({}, ctx);
    const names = ctx._ops.map((x: any[]) => x[0]);
    expect(names).toContain("kv.put");
  });

  it("throws when IO is accessed in a pure beat (guard example)", () => {
    const ctx: any = {
      io: new Proxy(
        {},
        {
          get() {
            throw new Error("IO not available in this beat");
          },
        }
      ),
    };
    expect(() => (ctx as any).io.kv.put("k", "v")).toThrow();
  });
});

