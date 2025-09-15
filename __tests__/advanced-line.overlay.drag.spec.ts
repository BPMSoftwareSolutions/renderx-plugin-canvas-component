/* @vitest-environment jsdom */
import { describe, it, expect, beforeEach } from "vitest";
import { handlers as createHandlers } from "@renderx-plugins/canvas-component/symphonies/create/create.symphony.ts";
import { handlers as selectHandlers } from "@renderx-plugins/canvas-component/symphonies/select/select.stage-crew.ts";
import { recomputeLineSvg } from "@renderx-plugins/canvas-component/symphonies/augment/line.recompute.stage-crew.ts";
import {
  setFlagOverride,
  clearFlagOverrides,
} from "../src/temp-deps/feature-flags";

function makeSvgLineTemplate() {
  return {
    tag: "svg",
    text: "",
    classes: ["rx-comp", "rx-line"],
    css: `.rx-line .segment { stroke: var(--stroke, #111827); stroke-width: var(--thickness, 2); }`,
    cssVariables: { stroke: "#111827", thickness: 2 },
    dimensions: { width: 120, height: 60 },
  } as any;
}

// This test reproduces the bug: overlay sends cumulative dx,dy per mousemove, but the handler
// adds dx,dy to the already-updated base each time, causing runaway drift (overextension/over-rotation).
// Expected: after two moves to (+4,+4) then (+10,+10) from the same start, the final endpoint delta
// should be exactly (+10,+10) relative to the initial position, not (+14,+14).

describe("Advanced Line overlay drag — cumulative delta causes runaway (expected failing)", () => {
  beforeEach(() => {
    document.body.innerHTML =
      '<div id="rx-canvas" style="position:relative"></div>';
    setFlagOverride("lineAdvanced", true);
  });

  it.fails("dragging endpoint A twice with cumulative deltas should not over-accumulate", async () => {
    const ctx: any = { payload: {} };
    const template = makeSvgLineTemplate();

    createHandlers.resolveTemplate({ component: { template } } as any, ctx);
    createHandlers.createNode({ position: { x: 0, y: 0 } } as any, ctx);

    const svg = document.querySelector(
      "#rx-canvas svg"
    ) as SVGSVGElement | null;
    expect(svg).toBeTruthy();
    const id = (svg as any).getAttribute("id");

    const host = svg as unknown as HTMLElement;
    // Initial endpoints: (10,10) -> (110,50)
    host.style.setProperty("--x1", "10");
    host.style.setProperty("--y1", "10");
    host.style.setProperty("--x2", "110");
    host.style.setProperty("--y2", "50");

    // Initial geometry
    recomputeLineSvg(svg!);

    // Attach advanced overlay for this selection
    // Intentionally omit conductor to force fallback path in overlay handler
    selectHandlers.showSelectionOverlay({ id });

    const overlay = document.getElementById(
      "rx-adv-line-overlay"
    ) as HTMLDivElement | null;
    expect(overlay).toBeTruthy();
    const handleA = overlay!.querySelector(
      ".handle.a"
    ) as HTMLDivElement | null;
    expect(handleA).toBeTruthy();

    // Simulate mousedown at arbitrary start
    handleA!.dispatchEvent(
      new MouseEvent("mousedown", { bubbles: true, clientX: 100, clientY: 100 })
    );

    // First mousemove: +4,+4 from start => dx=4,dy=4
    document.dispatchEvent(
      new MouseEvent("mousemove", { bubbles: true, clientX: 104, clientY: 104 })
    );

    // Second mousemove: +10,+10 from start => dx=10,dy=10 (cumulative)
    document.dispatchEvent(
      new MouseEvent("mousemove", { bubbles: true, clientX: 110, clientY: 110 })
    );

    // End drag
    document.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));

    // Inspect final line attributes
    const line = svg!.querySelector("line.segment") as SVGLineElement | null;
    expect(line).toBeTruthy();

    // Expected position for x1,y1: (10+10, 10+10) => (20, 20)
    // In viewBox units: x: 20/120*100  16.667, y: 20/60*100  33.333
    const x1 = Number(line!.getAttribute("x1"));
    const y1 = Number(line!.getAttribute("y1"));

    // This currently fails because compounding produces 24/120*100=20 and 24/60*100=40
    expect(x1).toBeGreaterThanOrEqual(16.6);
    expect(x1).toBeLessThanOrEqual(16.8);
    expect(y1).toBeGreaterThanOrEqual(33.2);
    expect(y1).toBeLessThanOrEqual(33.5);

    clearFlagOverrides();
  });
});

