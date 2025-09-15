/* @vitest-environment jsdom */
import { describe, it, expect, beforeEach } from "vitest";
import { handlers as createHandlers } from "@renderx-plugins/canvas-component/symphonies/create/create.symphony.ts";
import { moveLineManip } from "@renderx-plugins/canvas-component/symphonies/line-advanced/line.manip.stage-crew.ts";
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

describe("Advanced Line handlers — moveLineManip", () => {
  beforeEach(() => {
    document.body.innerHTML =
      '<div id="rx-canvas" style="position:relative"></div>';
    setFlagOverride("lineAdvanced", true);
  });

  it("updates endpoint A and recomputes line geometry", () => {
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
    host.style.setProperty("--x1", "10");
    host.style.setProperty("--y1", "10");
    host.style.setProperty("--x2", "110");
    host.style.setProperty("--y2", "50");

    recomputeLineSvg(svg!);
    const line = svg!.querySelector("line.segment") as SVGLineElement | null;
    expect(line).toBeTruthy();
    const x1Init = Number(line!.getAttribute("x1"));
    const y1Init = Number(line!.getAttribute("y1"));
    expect(x1Init).toBeGreaterThanOrEqual(8.2); // 10/120 * 100 ≈ 8.333
    expect(x1Init).toBeLessThanOrEqual(8.4);
    expect(y1Init).toBeGreaterThanOrEqual(16.6); // 10/60 * 100 ≈ 16.667
    expect(y1Init).toBeLessThanOrEqual(16.8);

    // Move A by (+10,+10)
    moveLineManip({ id, handle: "a", dx: 10, dy: 10 });

    const line2 = svg!.querySelector("line.segment") as SVGLineElement | null;
    expect(line2).toBeTruthy();
    // x1 should now reflect (20/120*100)=16.667
    const x1 = Number(line2!.getAttribute("x1"));
    const y1 = Number(line2!.getAttribute("y1"));
    expect(x1).toBeGreaterThanOrEqual(16.5);
    expect(x1).toBeLessThanOrEqual(16.8);
    expect(y1).toBeGreaterThanOrEqual(33.2); // 20/60*100 ≈ 33.333
    expect(y1).toBeLessThanOrEqual(33.5);

    clearFlagOverrides();
  });
});

