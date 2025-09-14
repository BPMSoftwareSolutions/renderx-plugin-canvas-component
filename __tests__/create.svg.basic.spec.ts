/* @vitest-environment jsdom */
import { describe, it, expect, beforeEach } from "vitest";
import { handlers as createHandlers } from "@renderx-plugins/canvas-component/symphonies/create/create.symphony.ts";

function makeSvgTemplate() {
  return {
    tag: "svg",
    text: "",
    classes: ["rx-comp", "rx-svg"],
    css: `.rx-svg * { vector-effect: non-scaling-stroke; }`,
    cssVariables: {},
    dimensions: { width: 900, height: 500 },
    // Provide default content values like mapper does
    content: { viewBox: "0 0 900 500", preserveAspectRatio: "xMidYMid meet" },
  } as any;
}

function makeCtx() {
  return { payload: {} } as any;
}

describe("SVG component (basic)", () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="rx-canvas" style="position:relative"></div>';
  });

  it("creates an <svg.rx-svg> with non-scaling-stroke CSS and default attributes", () => {
    const ctx: any = makeCtx();
    const template = makeSvgTemplate();

    createHandlers.resolveTemplate({ component: { template } } as any, ctx);
    createHandlers.createNode({ position: { x: 10, y: 20 } } as any, ctx);

    const svg = document.querySelector("#rx-canvas svg.rx-svg") as SVGSVGElement | null;
    expect(svg).toBeTruthy();

    // Defaults applied via content rules
    expect(svg!.getAttribute("viewBox")).toBe("0 0 900 500");
    expect(svg!.getAttribute("preserveAspectRatio")).toBe("xMidYMid meet");

    // CSS injection happens into a <style> element
    const styleEl = document.getElementById("rx-components-styles") as HTMLStyleElement | null;
    expect(styleEl?.textContent || "").toContain(".rx-svg * { vector-effect: non-scaling-stroke;");
  });
});

