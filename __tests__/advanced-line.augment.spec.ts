/* @vitest-environment jsdom */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
// Ensure lineAdvanced flag path is honored in package by mocking host-sdk flag check
vi.mock("@renderx-plugins/host-sdk", () => ({
  isFlagEnabled: (k: string) => (k === "lineAdvanced" ? true : false),
  useConductor: () => ({ play: () => {} }),
}));
import { handlers as createHandlers } from "@renderx-plugins/canvas-component/symphonies/create/create.symphony.ts";
import { enhanceLine } from "@renderx-plugins/canvas-component/symphonies/augment/augment.line.stage-crew.ts";
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

function makeCtx() {
  return { payload: {} } as any;
}

describe("Advanced Line augmentation (Phase 1)", () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="rx-canvas" style="position:relative"></div>';
    setFlagOverride("lineAdvanced", true);
  });
  afterEach(() => {
    clearFlagOverrides();
  });

  it.skip("adds defs with markers exactly once (idempotent)", () => {
    // TODO(#139 follow-up): In jsdom, instanceof SVGSVGElement check may differ across realms;
    // revisit enhanceLine guard or test harness to assert marker defs reliably.
    const ctx: any = makeCtx();
    const template = makeSvgLineTemplate();

    createHandlers.resolveTemplate({ component: { template } } as any, ctx);
    createHandlers.createNode({ position: { x: 10, y: 20 } } as any, ctx);

    const svg = document.querySelector("#rx-canvas svg") as SVGSVGElement | null;
    expect(svg).toBeTruthy();
    // Ensure target svg carries the rx-line class (host wrapper may hold it otherwise)
    (svg as any).classList.add("rx-line");
    // Direct the augment call at the actual SVG node
    ctx.payload.nodeId = String((svg as any).id);
    // Before augment: no defs
    expect(svg!.querySelector("defs#rx-line-markers")).toBeNull();

    // Call augment
    enhanceLine({}, ctx);
    const first = svg!.querySelectorAll("defs#rx-line-markers");
    expect(first.length).toBe(1);

    // Call augment again -> still one defs
    enhanceLine({}, ctx);
    const second = svg!.querySelectorAll("defs#rx-line-markers");
    expect(second.length).toBe(1);
  });
});

