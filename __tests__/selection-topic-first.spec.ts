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
      };
    }
    if (key === "control.panel.selection.show") {
      return {
        pluginId: "ControlPanelPlugin",
        sequenceId: "control-panel-selection-show-symphony",
      };
    }
    return { pluginId: "noop", sequenceId: key } as any;
  },
  isFlagEnabled: () => false,
  useConductor: () => ({ play: vi.fn() }),
}));

import { handlers as selectHandlers } from "../src/symphonies/select/select.stage-crew.ts";
import { EventRouter } from "@renderx-plugins/host-sdk";

describe("Topic-first selection approach", () => {
  let mockConductor: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup DOM
    document.body.innerHTML = `
      <div id="rx-canvas">
        <button id="rx-node-button123" class="rx-comp rx-button">Button</button>
        <div id="rx-node-container456" class="rx-comp rx-container">Container</div>
      </div>
    `;

    mockConductor = {
      play: vi.fn().mockResolvedValue(undefined),
    };
  });

  describe("Topic routing handler", () => {
    it("should route canvas.component.select.requested to selection sequence", async () => {
      const data = { id: "rx-node-button123" };
      const ctx = { conductor: mockConductor };

      // Act: Route the selection request
      await selectHandlers.routeSelectionRequest(data, ctx);

      // Assert: Should play the selection sequence with the ID
      expect(mockConductor.play).toHaveBeenCalledWith(
        "CanvasComponentPlugin",
        "canvas-component-select-symphony",
        { id: "rx-node-button123" }
      );
    });

    it("should handle missing ID gracefully", async () => {
      const data = {}; // no id
      const ctx = { conductor: mockConductor };

      // Act: Should not throw
      expect(async () => {
        await selectHandlers.routeSelectionRequest(data, ctx);
      }).not.toThrow();

      // Assert: Should not play sequence when no ID
      expect(mockConductor.play).not.toHaveBeenCalled();
    });

    it("should handle missing conductor gracefully", async () => {
      const data = { id: "rx-node-button123" };
      const ctx = {}; // no conductor

      // Act: Should not throw
      expect(async () => {
        await selectHandlers.routeSelectionRequest(data, ctx);
      }).not.toThrow();
    });
  });

  describe("Simplified handlers with guaranteed ID", () => {
    it("notifyUi should work with data.id from topic-first approach", () => {
      const data = { id: "rx-node-button123" }; // ID guaranteed from topic
      const ctx = { conductor: mockConductor };

      // Act
      selectHandlers.notifyUi(data, ctx);

      // Assert: Should play Control Panel sequence
      expect(mockConductor.play).toHaveBeenCalledWith(
        "ControlPanelPlugin",
        "control-panel-selection-show-symphony",
        { id: "rx-node-button123" }
      );
    });

    it("publishSelectionChanged should work with data.id from topic-first approach", async () => {
      const data = { id: "rx-node-container456" }; // ID guaranteed from topic
      const ctx = { conductor: mockConductor };

      // Act
      await selectHandlers.publishSelectionChanged(data, ctx);

      // Assert: Should publish selection changed topic
      expect(EventRouter.publish).toHaveBeenCalledWith(
        "canvas.component.selection.changed",
        { id: "rx-node-container456" },
        mockConductor
      );
    });

    it("should fallback to baton.id if data.id is missing", async () => {
      const data = {}; // no data.id
      const ctx = { 
        conductor: mockConductor,
        baton: { id: "rx-node-fallback" }
      };

      // Act
      selectHandlers.notifyUi(data, ctx);
      await selectHandlers.publishSelectionChanged(data, ctx);

      // Assert: Should use baton.id as fallback
      expect(mockConductor.play).toHaveBeenCalledWith(
        "ControlPanelPlugin",
        "control-panel-selection-show-symphony",
        { id: "rx-node-fallback" }
      );

      expect(EventRouter.publish).toHaveBeenCalledWith(
        "canvas.component.selection.changed",
        { id: "rx-node-fallback" },
        mockConductor
      );
    });
  });

  describe("Topic-first flow simulation", () => {
    it("should simulate complete topic-first selection flow", async () => {
      // Step 1: Host publishes canvas.component.select.requested (simulated)
      const requestData = { id: "rx-node-button123" };
      
      // Step 2: Topic routing handler routes to selection sequence
      await selectHandlers.routeSelectionRequest(requestData, { conductor: mockConductor });
      
      // Verify routing happened
      expect(mockConductor.play).toHaveBeenCalledWith(
        "CanvasComponentPlugin",
        "canvas-component-select-symphony",
        { id: "rx-node-button123" }
      );

      // Step 3: Selection sequence runs with guaranteed ID
      const selectionData = { id: "rx-node-button123" }; // ID from routing
      const selectionCtx = { conductor: mockConductor, baton: {} };

      // Beat 1: Show overlay (would derive ID but already has it)
      const overlayResult = selectHandlers.showSelectionOverlay(selectionData, selectionCtx);
      expect(overlayResult).toEqual({ id: "rx-node-button123" });

      // Beat 2: Notify UI (uses data.id directly)
      selectHandlers.notifyUi(selectionData, selectionCtx);
      expect(mockConductor.play).toHaveBeenCalledWith(
        "ControlPanelPlugin",
        "control-panel-selection-show-symphony",
        { id: "rx-node-button123" }
      );

      // Beat 3: Publish selection changed (uses data.id directly)
      await selectHandlers.publishSelectionChanged(selectionData, selectionCtx);
      expect(EventRouter.publish).toHaveBeenCalledWith(
        "canvas.component.selection.changed",
        { id: "rx-node-button123" },
        mockConductor
      );
    });
  });
});
