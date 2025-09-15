/* @vitest-environment jsdom */
import { describe, it, expect, beforeEach } from "vitest";
import { handlers as createHandlers } from "@renderx-plugins/canvas-component/symphonies/create/create.symphony.ts";
import { recomputeLineSvg } from "@renderx-plugins/canvas-component/symphonies/augment/line.recompute.stage-crew.ts";

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

function makeCtx() {
  return { payload: {} } as any;
}

describe("Advanced Line — dynamic viewBox autosize", () => {
  beforeEach(() => {
    document.body.innerHTML =
      '<div id="rx-canvas" style="position:relative"></div>';
  });

  it("expands viewBox when endpoints extend beyond element bounds (no rotation)", () => {
    const ctx: any = makeCtx();
    const template = makeSvgLineTemplate();
    createHandlers.resolveTemplate({ component: { template } } as any, ctx);
    createHandlers.createNode({ position: { x: 0, y: 0 } } as any, ctx);

    const svg = document.querySelector("#rx-canvas svg") as SVGSVGElement;
    const host = svg as unknown as HTMLElement;

    // Host size 120x60; set endpoints outside in px
    host.style.setProperty("--x1", "-20");
    host.style.setProperty("--y1", "10");
    host.style.setProperty("--x2", "180"); // 60px beyond width
    host.style.setProperty("--y2", "50");

    recomputeLineSvg(svg);

    const vb = (svg.getAttribute("viewBox") || "0 0 100 100")
      .split(/\s+/)
      .map(parseFloat);
    const [minX, , vbW] = vb;

    // In normalized units: x1=-16.67, x2=150. Expect viewBox to cover this range
    expect(minX).toBeLessThanOrEqual(-10);
    expect(vbW).toBeGreaterThan(100); // width grew beyond default
  });

  it("adds headroom when rotated so the line is never clipped", () => {
    const ctx: any = makeCtx();
    const template = makeSvgLineTemplate();
    createHandlers.resolveTemplate({ component: { template } } as any, ctx);
    createHandlers.createNode({ position: { x: 0, y: 0 } } as any, ctx);

    const svg = document.querySelector("#rx-canvas svg") as SVGSVGElement;
    const host = svg as unknown as HTMLElement;

    // Long line beyond width and rotated 45deg
    host.style.setProperty("--x1", "0");
    host.style.setProperty("--y1", "30");
    host.style.setProperty("--x2", "180");
    host.style.setProperty("--y2", "30");
    host.style.setProperty("--angle", "45");

    recomputeLineSvg(svg);

    const vb = (svg.getAttribute("viewBox") || "0 0 100 100")
      .split(/\s+/)
      .map(parseFloat);
    const [, , vbW, vbH] = vb;

    // Expect larger bounds than the default 100x100 due to over-extent + rotation
    expect(vbW).toBeGreaterThan(100);
    expect(vbH).toBeGreaterThan(100);
  });
});

