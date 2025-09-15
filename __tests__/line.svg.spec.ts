/* @vitest-environment jsdom */
import { describe, it, expect, beforeEach } from "vitest";
import { handlers as createHandlers } from "@renderx-plugins/canvas-component/symphonies/create/create.symphony";
import { handlers as resizeHandlers } from "@renderx-plugins/canvas-component/symphonies/resize/resize.stage-crew";

function makeSvgLineTemplate() {
  return {
    tag: "svg",
    text: "",
    classes: ["rx-comp", "rx-line"],
    // Provide CSS so stroke/thickness resolve from CSS variables
    css: `.rx-line .segment { stroke: var(--stroke, #111827); stroke-width: var(--thickness, 2); }`,
    cssVariables: { stroke: "#111827", thickness: 2 },
    dimensions: { width: 120, height: 60 },
  } as any;
}

function makeCtx() {
  return { payload: {} } as any;
}

describe("SVG Line component", () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="rx-canvas" style="position:relative"></div>';
  });

  it("creates an <svg> with a child <line.segment> that uses CSS vars and non-scaling stroke", () => {
    const ctx: any = makeCtx();
    const template = makeSvgLineTemplate();

    createHandlers.resolveTemplate({ component: { template } } as any, ctx);
    createHandlers.createNode({ position: { x: 10, y: 20 } } as any, ctx);

    const svg = document.querySelector("#rx-canvas svg") as SVGSVGElement | null;
    expect(svg).toBeTruthy();

    const line = svg!.querySelector("line.segment") as SVGLineElement | null;
    expect(line).toBeTruthy();

    // Should set vector-effect for non-scaling stroke
    expect(line!.getAttribute("vector-effect")).toBe("non-scaling-stroke");

    // CSS variables should be present on the instance class via injection
    // We assert the style element contains our CSS rule (jsdom won't compute SVG styles)
    const styleEl = document.getElementById("rx-components-styles") as HTMLStyleElement | null;
    expect(styleEl?.textContent || "").toContain(".rx-line .segment");
  });

  it("resizes via stage-crew updateSize and keeps element dimensions updated", () => {
    const ctx: any = makeCtx();
    const template = makeSvgLineTemplate();

    createHandlers.resolveTemplate({ component: { template } } as any, ctx);
    createHandlers.createNode({ position: { x: 10, y: 20 } } as any, ctx);

    const id = ctx.payload.nodeId as string;
    const el = document.getElementById(id)! as HTMLElement;

    // Initial size
    expect(el.style.width).toBe("120px");
    expect(el.style.height).toBe("60px");

    // Simulate resize move (SE handle semantics are managed by overlay; here we just call updateSize)
    const payload = {
      id,
      dir: "se",
      startLeft: 10,
      startTop: 20,
      startWidth: 120,
      startHeight: 60,
      dx: 30,
      dy: 10,
      phase: "move",
    } as any;

    resizeHandlers.updateSize?.(payload, {} as any);

    expect(el.style.width).toBe("150px");
    expect(el.style.height).toBe("70px");

    // Child line should still exist and have non-scaling stroke
    const line = el.querySelector("line.segment") as SVGLineElement | null;
    expect(line).toBeTruthy();
    expect(line!.getAttribute("vector-effect")).toBe("non-scaling-stroke");
  });
});

