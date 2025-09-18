/* @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock host SDK with spies for EventRouter.publish and resolveInteraction
vi.mock("@renderx-plugins/host-sdk", () => ({
  EventRouter: {
    publish: vi.fn().mockResolvedValue(undefined),
  },
  resolveInteraction: (key: string) => {
    if (key === "canvas.component.delete") {
      return { pluginId: "CanvasComponentDeletePlugin", sequenceId: "canvas-component-delete-symphony" };
    }
    return { pluginId: "noop", sequenceId: key } as any;
  },
  useConductor: () => ({ play: () => {} }),
}));

import { EventRouter } from "@renderx-plugins/host-sdk";
import { handlers as deleteHandlers } from "../src/symphonies/delete/delete.stage-crew.ts";

function ensureOverlays() {
  const sel = document.getElementById("rx-selection-overlay") || document.createElement("div");
  sel.id = "rx-selection-overlay";
  document.body.appendChild(sel);
  const adv = document.getElementById("rx-adv-line-overlay") || document.createElement("div");
  adv.id = "rx-adv-line-overlay";
  document.body.appendChild(adv);
  return { sel: sel as HTMLDivElement, adv: adv as HTMLDivElement };
}

function ensureComponent(id: string) {
  const el = document.createElement("div");
  el.id = id;
  el.className = "rx-comp";
  document.body.appendChild(el);
  return el;
}

describe("Canvas component delete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = "";
  });

  it("publishes canvas.component.deleted when publishDeleted is called", async () => {
    const conductor = { play: vi.fn() };
    const ctx = { conductor, baton: { id: "rx-node-abc" } } as any;

    await (deleteHandlers as any).publishDeleted({}, ctx);

    expect(EventRouter.publish).toHaveBeenCalledWith(
      "canvas.component.deleted",
      { id: "rx-node-abc" },
      conductor
    );
  });

  it("removes element, hides overlays, and publishes topic when deleteComponent is called", async () => {
    const { sel, adv } = ensureOverlays();
    sel.style.display = "block";
    adv.style.display = "block";
    ensureComponent("rx-node-abc");
    sel.dataset.targetId = "rx-node-abc";
    adv.dataset.targetId = "rx-node-abc";

    const conductor = { play: vi.fn() };
    const ctx = { conductor } as any;

    await (deleteHandlers as any).deleteComponent({ id: "rx-node-abc" }, ctx);

    expect(document.getElementById("rx-node-abc")).toBeNull();
    expect(sel.style.display).toBe("none");
    expect(adv.style.display).toBe("none");

    expect(EventRouter.publish).toHaveBeenCalledWith(
      "canvas.component.deleted",
      { id: "rx-node-abc" },
      conductor
    );
  });

  it("routeDeleteRequest plays delete sequence with provided id", async () => {
    const play = vi.fn();
    const conductor = { play };
    const ctx = { conductor } as any;

    await (deleteHandlers as any).routeDeleteRequest({ id: "rx-node-1" }, ctx);

    expect(play).toHaveBeenCalledWith(
      "CanvasComponentDeletePlugin",
      "canvas-component-delete-symphony",
      { id: "rx-node-1" }
    );
  });

  it("routeDeleteRequest derives id from overlay when not provided", async () => {
    const { sel } = ensureOverlays();
    sel.dataset.targetId = "rx-node-xyz";

    const play = vi.fn();
    const conductor = { play };
    const ctx = { conductor } as any;

    await (deleteHandlers as any).routeDeleteRequest({}, ctx);

    expect(play).toHaveBeenCalledWith(
      "CanvasComponentDeletePlugin",
      "canvas-component-delete-symphony",
      { id: "rx-node-xyz" }
    );
  });
});

