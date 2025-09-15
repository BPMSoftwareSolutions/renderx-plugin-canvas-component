/* @vitest-environment jsdom */
import { describe, it, expect, beforeEach } from "vitest";
import { handlers as createHandlers } from "@renderx-plugins/canvas-component/symphonies/create/create.symphony.ts";
import { handlers as resizeHandlers } from "@renderx-plugins/canvas-component/symphonies/resize/resize.symphony.ts";
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

describe("Advanced Line — endpoints scale with resize", () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="rx-canvas" style="position:relative"></div>';
  });

  it("proportionally scales --x1/--y1/--x2/--y2 when resizing the element", () => {
    const ctx: any = makeCtx();
    const template = makeSvgLineTemplate();

    // Create element
    createHandlers.resolveTemplate({ component: { template } } as any, ctx);
    createHandlers.createNode({ position: { x: 10, y: 20 } } as any, ctx);

    const id = ctx.payload.nodeId as string;
    const el = document.getElementById(id)! as HTMLElement;
    const svg = el as unknown as SVGSVGElement;

    // Seed endpoints (px in element space)
    el.style.setProperty("--x1", "10");
    el.style.setProperty("--y1", "10");
    el.style.setProperty("--x2", "110");
    el.style.setProperty("--y2", "50");

    // Initial recompute => establishes baseline attributes
    recomputeLineSvg(svg);
    const line1 = svg.querySelector("line.segment") as SVGLineElement;
    const x2AttrInitial = parseFloat(line1.getAttribute("x2") || "0");

    // Begin resize and move SE inward by half width/height (shrink)
    const startLeft = 10;
    const startTop = 20;
    const startWidth = 120;
    const startHeight = 60;

    resizeHandlers.startResize?.({ id });
    resizeHandlers.updateSize?.(
      {
        id,
        dir: "se",
        startLeft,
        startTop,
        startWidth,
        startHeight,
        dx: -60, // new width = 60
        dy: -30, // new height = 30
        phase: "move",
      },
      {} as any
    );

    // Endpoints should have been scaled by 0.5
    const x1 = parseFloat(el.style.getPropertyValue("--x1"));
    const y1 = parseFloat(el.style.getPropertyValue("--y1"));
    const x2 = parseFloat(el.style.getPropertyValue("--x2"));
    const y2 = parseFloat(el.style.getPropertyValue("--y2"));

    expect(x1).toBeCloseTo(5, 5);
    expect(y1).toBeCloseTo(5, 5);
    expect(x2).toBeCloseTo(55, 5);
    expect(y2).toBeCloseTo(25, 5);

    // After recompute, relative percentages should be preserved
    recomputeLineSvg(svg);
    const line2 = svg.querySelector("line.segment") as SVGLineElement;
    const x2AttrNext = parseFloat(line2.getAttribute("x2") || "0");

    // The percentage of x2 in viewBox should remain the same
    expect(x2AttrNext).toBeCloseTo(x2AttrInitial, 5);
  });
});

