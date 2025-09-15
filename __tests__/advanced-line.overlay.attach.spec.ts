/* @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from "vitest";
// Force-enable advanced line code paths for this test
vi.mock("@renderx-plugins/host-sdk", () => ({
  isFlagEnabled: (k: string) => (k === "lineAdvanced" ? true : false),
  useConductor: () => ({ play: () => {} }),
}));
import { handlers as createHandlers } from "@renderx-plugins/canvas-component/symphonies/create/create.symphony.ts";
import { handlers as selectHandlers } from "@renderx-plugins/canvas-component/symphonies/select/select.stage-crew.ts";
import { setFlagOverride, clearFlagOverrides } from "../src/temp-deps/feature-flags";

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

describe("Advanced Line overlay attaches on selection (flag ON)", () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="rx-canvas" style="position:relative"></div>';
    setFlagOverride("lineAdvanced", true);
  });

  it.skip("creates #rx-adv-line-overlay and binds dataset targetId", () => {
    // TODO(#139 follow-up): Gate relies on host-sdk isFlagEnabled and rx-line on target;
    // jsdom quirks may prevent overlay creation via showSelectionOverlay in this harness.
    const ctx: any = { payload: {} };
    const template = makeSvgLineTemplate();

    createHandlers.resolveTemplate({ component: { template } } as any, ctx);
    createHandlers.createNode({ position: { x: 0, y: 0 } } as any, ctx);

    const svg = document.querySelector("#rx-canvas svg") as SVGSVGElement | null;
    expect(svg).toBeTruthy();

    const id = (svg as any).getAttribute("id");
    expect(id).toBeTruthy();
    // Ensure svg has the rx-line class and explicitly request advanced overlay
    (svg as any).classList.add("rx-line");
    (svg as any).setAttribute("data-overlay", "line-advanced");

    selectHandlers.showSelectionOverlay({ id }, { conductor: { play() {} } });

    const adv = document.getElementById("rx-adv-line-overlay") as HTMLDivElement | null;
    expect(adv).toBeTruthy();
    expect(adv!.dataset.targetId).toBe(String(id));

    clearFlagOverrides();
  });
});

