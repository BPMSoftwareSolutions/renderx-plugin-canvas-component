/* @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock host SDK with spies for EventRouter.publish and resolveInteraction
vi.mock("@renderx-plugins/host-sdk", () => ({
  EventRouter: {
    publish: vi.fn().mockResolvedValue(undefined),
  },
  resolveInteraction: (key: string) => {
    if (key === "canvas.component.deselect") {
      return { pluginId: "CanvasComponentPlugin", sequenceId: "canvas-component-deselect-symphony" };
    }
    if (key === "canvas.component.deselect.all") {
      return { pluginId: "CanvasComponentPlugin", sequenceId: "canvas-component-deselect-all-symphony" };
    }
    return { pluginId: "noop", sequenceId: key } as any;
  },
  useConductor: () => ({ play: () => {} }),
}));

import { EventRouter } from "@renderx-plugins/host-sdk";
import { handlers as deselectHandlers } from "../src/symphonies/deselect/deselect.stage-crew.ts";

function ensureOverlays() {
  const sel = document.getElementById("rx-selection-overlay") || document.createElement("div");
  sel.id = "rx-selection-overlay";
  document.body.appendChild(sel);
  const adv = document.getElementById("rx-adv-line-overlay") || document.createElement("div");
  adv.id = "rx-adv-line-overlay";
  document.body.appendChild(adv);
  return { sel: sel as HTMLDivElement, adv: adv as HTMLDivElement };
}

describe("Canvas component deselection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = "";
  });

  it("publishes canvas.component.deselection.changed when publishDeselectionChanged is called", async () => {
    const conductor = { play: vi.fn() };
    const ctx = { conductor, baton: { id: "rx-node-abc" } };

    await (deselectHandlers as any).publishDeselectionChanged({}, ctx);

    expect(EventRouter.publish).toHaveBeenCalledWith(
      "canvas.component.deselection.changed",
      { id: "rx-node-abc" },
      conductor
    );
  });

  it("publishes canvas.component.selections.cleared when publishSelectionsCleared is called", async () => {
    const conductor = { play: vi.fn() };
    const ctx = { conductor };

    await (deselectHandlers as any).publishSelectionsCleared({}, ctx);

    expect(EventRouter.publish).toHaveBeenCalledWith(
      "canvas.component.selections.cleared",
      {},
      conductor
    );
  });

  it("hides overlays targeting the ID when deselectComponent is called and publishes topic", async () => {
    const { sel, adv } = ensureOverlays();
    sel.style.display = "block";
    adv.style.display = "block";
    sel.dataset.targetId = "rx-node-abc";
    adv.dataset.targetId = "rx-node-abc";

    const conductor = { play: vi.fn() };
    const ctx = { conductor };

    await (deselectHandlers as any).deselectComponent({ id: "rx-node-abc" }, ctx);

    expect(sel.style.display).toBe("none");
    expect(adv.style.display).toBe("none");

    expect(EventRouter.publish).toHaveBeenCalledWith(
      "canvas.component.deselection.changed",
      { id: "rx-node-abc" },
      conductor
    );
  });

  it("clearAllSelections hides both overlays and clears dataset.targetId then publishes cleared topic", async () => {
    const { sel, adv } = ensureOverlays();
    sel.style.display = "block";
    adv.style.display = "block";
    sel.dataset.targetId = "rx-node-xyz";
    adv.dataset.targetId = "rx-node-abc";

    const conductor = { play: vi.fn() };
    const ctx = { conductor };

    await (deselectHandlers as any).clearAllSelections({}, ctx);

    expect(sel.style.display).toBe("none");
    expect(adv.style.display).toBe("none");
    expect(sel.dataset.targetId || "").toBe("");
    expect(adv.dataset.targetId || "").toBe("");

    expect(EventRouter.publish).toHaveBeenCalledWith(
      "canvas.component.selections.cleared",
      {},
      conductor
    );
  });

  it("routeDeselectionRequest routes to deselect sequence when id is provided", async () => {
    const play = vi.fn();
    const conductor = { play };
    const ctx = { conductor };

    await (deselectHandlers as any).routeDeselectionRequest({ id: "rx-node-1" }, ctx);

    expect(play).toHaveBeenCalledWith(
      "CanvasComponentPlugin",
      "canvas-component-deselect-symphony",
      { id: "rx-node-1" }
    );
  });

  it("routeDeselectionRequest routes to deselect-all sequence when no id provided", async () => {
    const play = vi.fn();
    const conductor = { play };
    const ctx = { conductor };

    await (deselectHandlers as any).routeDeselectionRequest({}, ctx);

    expect(play).toHaveBeenCalledWith(
      "CanvasComponentPlugin",
      "canvas-component-deselect-all-symphony",
      {}
    );
  });
});

