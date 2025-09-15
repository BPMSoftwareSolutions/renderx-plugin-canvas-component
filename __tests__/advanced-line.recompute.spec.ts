/* @vitest-environment jsdom */
import { describe, it, expect, beforeEach } from "vitest";
import { handlers as createHandlers } from "@renderx-plugins/canvas-component/symphonies/create/create.symphony.ts";
import { enhanceLine } from "@renderx-plugins/canvas-component/symphonies/augment/augment.line.stage-crew.ts";
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
    css: `.rx-line .segment, .rx-line .segment-curve { stroke: var(--stroke, #111827); stroke-width: var(--thickness, 2); fill: none; }`,
    cssVariables: { stroke: "#111827", thickness: 2 },
    dimensions: { width: 120, height: 60 },
  } as any;
}

function makeCtx() {
  return { payload: {} } as any;
}

describe("Advanced Line recompute (Phase 2+3)", () => {
  beforeEach(() => {
    document.body.innerHTML =
      '<div id="rx-canvas" style="position:relative"></div>';
    setFlagOverride("lineAdvanced", true);
  });

  it("maps CSS vars to line x1/y1/x2/y2 in viewBox coordinates", () => {
    const ctx: any = makeCtx();
    const template = makeSvgLineTemplate();

    createHandlers.resolveTemplate({ component: { template } } as any, ctx);
    createHandlers.createNode({ position: { x: 10, y: 20 } } as any, ctx);

    const svg = document.querySelector(
      "#rx-canvas svg"
    ) as SVGSVGElement | null;
    expect(svg).toBeTruthy();

    // Augment (adds defs markers; not strictly needed for recompute)
    enhanceLine({}, ctx);

    const host = svg as unknown as HTMLElement;
    // Host sized by createNode to 120x60
    expect(host.style.width).toBe("120px");
    expect(host.style.height).toBe("60px");

    // Set endpoints in px coordinates relative to host size
    host.style.setProperty("--x1", "0");
    host.style.setProperty("--y1", "30"); // middle of height (60)
    host.style.setProperty("--x2", "120"); // full width
    host.style.setProperty("--y2", "30");

    recomputeLineSvg(svg!);

    const line = svg!.querySelector("line.segment") as SVGLineElement | null;
    expect(line).toBeTruthy();

    // Expect 0,50 to 100,50 (scaled into 0..100 viewBox)
    expect(line!.getAttribute("x1")).toBe("0");
    expect(line!.getAttribute("y1")).toBe("50");
    expect(line!.getAttribute("x2")).toBe("100");
    expect(line!.getAttribute("y2")).toBe("50");
  });

  it("toggles marker-end via --arrowEnd CSS var", () => {
    const ctx: any = makeCtx();
    const template = makeSvgLineTemplate();

    createHandlers.resolveTemplate({ component: { template } } as any, ctx);
    createHandlers.createNode({ position: { x: 0, y: 0 } } as any, ctx);

    const svg = document.querySelector("#rx-canvas svg") as SVGSVGElement;
    const host = svg as unknown as HTMLElement;

    // off by default
    recomputeLineSvg(svg);
    let line = svg.querySelector("line.segment") as SVGLineElement;
    expect(line.getAttribute("marker-end")).toBe(null);

    host.style.setProperty("--arrowEnd", "1");
    recomputeLineSvg(svg);
    line = svg.querySelector("line.segment") as SVGLineElement;
    expect(line.getAttribute("marker-end")).toBe("url(#rx-arrow-end)");

    host.style.setProperty("--arrowEnd", "0");
    recomputeLineSvg(svg);
    line = svg.querySelector("line.segment") as SVGLineElement;
    expect(line.getAttribute("marker-end")).toBe(null);

    clearFlagOverrides();
  });

  it("renders quadratic path when --curve=1 with --cx/--cy", () => {
    const ctx: any = makeCtx();
    const template = makeSvgLineTemplate();

    createHandlers.resolveTemplate({ component: { template } } as any, ctx);
    createHandlers.createNode({ position: { x: 0, y: 0 } } as any, ctx);

    const svg = document.querySelector("#rx-canvas svg") as SVGSVGElement;
    const host = svg as unknown as HTMLElement;

    host.style.setProperty("--x1", "0");
    host.style.setProperty("--y1", "30");
    host.style.setProperty("--x2", "120");
    host.style.setProperty("--y2", "30");
    host.style.setProperty("--cx", "60");
    host.style.setProperty("--cy", "10");
    host.style.setProperty("--curve", "1");

    recomputeLineSvg(svg);

    const line = svg.querySelector("line.segment") as SVGLineElement;
    const path = svg.querySelector("path.segment-curve") as SVGPathElement;
    expect(line.style.display || "").toBe("none");
    expect(path).toBeTruthy();
    expect(path.getAttribute("d") || "").toMatch(/^M\s*0\s*50\s*Q\s*50/); // rough check: contains a Q command
  });

  it("applies rotate transform when --angle is set", () => {
    const ctx: any = makeCtx();
    const template = makeSvgLineTemplate();

    createHandlers.resolveTemplate({ component: { template } } as any, ctx);
    createHandlers.createNode({ position: { x: 0, y: 0 } } as any, ctx);

    const svg = document.querySelector("#rx-canvas svg") as SVGSVGElement;
    const host = svg as unknown as HTMLElement;

    host.style.setProperty("--x1", "0");
    host.style.setProperty("--y1", "30");
    host.style.setProperty("--x2", "120");
    host.style.setProperty("--y2", "30");
    host.style.setProperty("--angle", "45");

    recomputeLineSvg(svg);

    const line = svg.querySelector("line.segment") as SVGLineElement;
    expect(line.getAttribute("transform") || "").toContain("rotate(45");
  });
});

