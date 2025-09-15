/* @vitest-environment jsdom */
import { describe, it, expect, beforeEach } from "vitest";
import { handlers as createHandlers } from "@renderx-plugins/canvas-component/symphonies/create/create.symphony.ts";
import { handlers as resizeHandlers } from "@renderx-plugins/canvas-component/symphonies/resize/resize.stage-crew.ts";

function makeSvgTemplate() {
  return {
    tag: "svg",
    text: "",
    classes: ["rx-comp", "rx-svg"],
    css: `.rx-svg * { vector-effect: non-scaling-stroke; }`,
    cssVariables: {},
    dimensions: { width: 300, height: 200 },
    content: { viewBox: "0 0 300 200", preserveAspectRatio: "xMidYMid meet" },
  } as any;
}

describe("SVG component resize behavior", () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="rx-canvas" style="position:relative"></div>';
  });

  it("resizes outer dimensions while content preserves stroke thickness via CSS", () => {
    const ctx: any = { payload: {} };
    const template = makeSvgTemplate();

    createHandlers.resolveTemplate({ component: { template } } as any, ctx);
    createHandlers.createNode({ position: { x: 10, y: 20 } } as any, ctx);

    const id = ctx.payload.nodeId as string;
    const el = document.getElementById(id)! as HTMLElement;

    // Initial size
    expect(el.style.width).toBe("300px");
    expect(el.style.height).toBe("200px");

    // Simulate conductor-driven SE resize
    const payload = {
      id,
      dir: "se",
      startLeft: 10,
      startTop: 20,
      startWidth: 300,
      startHeight: 200,
      dx: 150,
      dy: 100,
      phase: "move",
    } as any;

    resizeHandlers.updateSize?.(payload, {} as any);

    expect(el.style.width).toBe("450px");
    expect(el.style.height).toBe("300px");

    // Ensure the SVG element exists and attributes applied
    expect(el.tagName.toLowerCase()).toBe("svg");
    const svg = el as unknown as SVGSVGElement;
    expect(svg.getAttribute("preserveAspectRatio")).toBe("xMidYMid meet");
  });
});

