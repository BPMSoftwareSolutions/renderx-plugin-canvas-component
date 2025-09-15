/* @vitest-environment jsdom */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

vi.mock("@renderx-plugins/host-sdk", () => ({
  resolveInteraction: (key: string) => {
    if (key === "canvas.component.select") {
      return {
        pluginId: "CanvasComponentPlugin",
        sequenceId: "canvas-component-select-symphony",
      };
    }
    return { pluginId: "noop", sequenceId: key } as any;
  },
}));

import { setupHostClickToSelect } from "./helpers/host-click-select";

describe("Host-like click-to-select harness forwards to canvas.component.select", () => {
  let dispose: undefined | (() => void);

  beforeEach(() => {
    document.body.innerHTML = '<div id="rx-canvas"><button id="b1" class="rx-comp rx-button">Button</button></div>';
  });

  afterEach(() => {
    try { dispose?.(); } catch {}
    dispose = undefined;
  });

  it("clicking an rx-comp element triggers conductor.play with the select sequence", () => {
    const play = vi.fn();
    const getConductor = () => ({ play });

    dispose = setupHostClickToSelect(getConductor);

    document.getElementById("b1")!.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(play).toHaveBeenCalledWith(
      "CanvasComponentPlugin",
      "canvas-component-select-symphony",
      { id: "b1" }
    );
  });
});

