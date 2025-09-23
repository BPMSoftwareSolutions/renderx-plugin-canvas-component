/* @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock host SDK
vi.mock("@renderx-plugins/host-sdk", () => ({
  EventRouter: {
    publish: vi.fn().mockResolvedValue(undefined),
  },
  resolveInteraction: (key: string) => {
    if (key === "canvas.component.select") {
      return {
        pluginId: "CanvasComponentPlugin",
        sequenceId: "canvas-component-select-symphony",
      } as any;
    }
    if (key === "control.panel.selection.show") {
      return {
        pluginId: "ControlPanelPlugin",
        sequenceId: "control-panel-selection-show-symphony",
      } as any;
    }
    return { pluginId: "noop", sequenceId: key } as any;
  },
  isFlagEnabled: () => false,
  useConductor: () => ({ play: vi.fn() }),
}));

import { handlers as selectHandlers } from "../src/symphonies/select/select.stage-crew.ts";
import { EventRouter } from "@renderx-plugins/host-sdk";

describe("Selection routing loop regression", () => {
  let mockConductor: any;

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = `<div id="rx-canvas"></div>`;
    mockConductor = { play: vi.fn().mockResolvedValue(undefined) };
  });

  it("routeSelectionRequest should not re-route when _routed is true", async () => {
    const data = { id: "rx-node-button123", _routed: true };
    const ctx = { conductor: mockConductor };

    await selectHandlers.routeSelectionRequest(data, ctx);

    expect(mockConductor.play).not.toHaveBeenCalled();
  });

  it("routeSelectionRequest should not publish any request topics", async () => {
    const data = { id: "rx-node-button123" };
    const ctx = { conductor: mockConductor };

    await selectHandlers.routeSelectionRequest(data, ctx);

    // Router only plays the selection sequence; it should not publish topics
    expect(EventRouter.publish).not.toHaveBeenCalled();
  });

  it("publishSelectionChanged publishes selection.changed and not select.requested", async () => {
    const data = { id: "rx-node-container456" };
    const ctx = { conductor: mockConductor };

    await selectHandlers.publishSelectionChanged(data, ctx);

    // Ensure no request topic was published
    const calls = (EventRouter.publish as any).mock.calls as any[];
    const requestedCalls = calls.filter((c) => String(c?.[0] || "").includes("canvas.component.select.requested"));
    expect(requestedCalls.length).toBe(0);

    // Ensure selection.changed was published once
    expect(EventRouter.publish).toHaveBeenCalledWith(
      "canvas.component.selection.changed",
      { id: "rx-node-container456" },
      mockConductor
    );
  });
});

