/* @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from "vitest";
// Mutable mock flag with setter so the mocked module reads latest value
vi.mock("@renderx-plugins/host-sdk", () => {
  const state = { transform: false };
  return {
    isFlagEnabled: (k: string) =>
      k === "perf.drag.use-transform" ? state.transform : false,
    useConductor: () => ({ play: () => {} }),
    __setPerfTransform: (v: boolean) => {
      state.transform = v;
    },
  };
});
import { handlers } from "@renderx-plugins/canvas-component/symphonies/drag/drag.stage-crew.ts";
import * as HostSdk from "@renderx-plugins/host-sdk";

function makeCtx() {
  return { payload: {} } as any;
}

describe("canvas-component drag — transform path (flag)", () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="rx-canvas"></div>';
  });

  it("falls back to left/top when flag off", () => {
    const el = document.createElement("div");
    el.id = "node1";
    el.style.position = "absolute";
    el.style.left = "0px";
    el.style.top = "0px";
    document.getElementById("rx-canvas")!.appendChild(el);

    const ctx = makeCtx();
    const moveData = { id: "node1", position: { x: 10, y: 20 } };
    const result = (handlers as any).updatePosition(moveData, ctx);
    expect(result.success).toBe(true);
    expect(el.style.left).toBe("10px");
    expect(el.style.top).toBe("20px");
    expect(el.style.transform || "").toBe("");
  });

  it.skip("uses CSS vars when perf.drag.use-transform is ON (by setFlagOverride)", async () => {
    const el = document.createElement("div");
    el.id = "node2";
    el.style.position = "absolute";
    el.style.left = "0px";
    el.style.top = "0px";
    document.getElementById("rx-canvas")!.appendChild(el);


    const ctx = makeCtx();
    const moveData = { id: "node2", position: { x: 15, y: 25 } };

    // enable transform path in mocked host-sdk
    (HostSdk as any).__setPerfTransform(true);

    const result = (handlers as any).updatePosition(moveData, ctx);
    expect(result.success).toBe(true);
    // transform path: will-change is set to transform and left/top remain unchanged
    expect(el.style.willChange).toBe("transform");
    expect(el.style.left).toBe("0px");
    expect(el.style.top).toBe("0px");

    perfTransformFlag = false;
  });
});

