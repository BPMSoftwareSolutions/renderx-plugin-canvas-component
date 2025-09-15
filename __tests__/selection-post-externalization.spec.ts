import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { JSDOM } from "jsdom";
import { EventRouter, useConductor } from "@renderx-plugins/host-sdk";
import { handlers as selectHandlers } from "../src/symphonies/select/select.stage-crew";

// Mock Host SDK
vi.mock("@renderx-plugins/host-sdk", () => ({
  EventRouter: {
    publish: vi.fn(),
  },
  useConductor: vi.fn(() => ({ play: vi.fn() })),
  isFlagEnabled: vi.fn(() => false),
}));

describe("Selection after externalization - comprehensive tests", () => {
  let dom: JSDOM;
  let mockConductor: any;

  beforeEach(() => {
    // Set up DOM environment with canvas and components
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <body>
          <div id="rx-canvas" style="position: relative; width: 800px; height: 600px;">
            <div id="rx-node-abc" class="rx-comp rx-button">Button Component</div>
            <div id="rx-node-def" class="rx-comp rx-container">Container Component</div>
            <svg id="rx-node-ghi" class="rx-comp rx-line">
              <line x1="0" y1="0" x2="100" y2="100" />
            </svg>
          </div>
        </body>
      </html>
    `);
    global.document = dom.window.document;
    global.HTMLElement = dom.window.HTMLElement;
    global.Element = dom.window.Element;

    // Mock conductor
    mockConductor = {
      play: vi.fn(),
    };

    // Clear all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    dom.window.close();
  });

  describe("Non-SVG selection triggers both direct play and publish", () => {
    it("should handle button component selection end-to-end", async () => {
      // Arrange: DOM element <div id="rx-node-abc" class="rx-comp rx-button">
      const buttonElement = document.getElementById("rx-node-abc");
      const mockEvent = { target: buttonElement };
      
      // Mock: ctx with baton and conductor, EventRouter.publish
      const ctx = { baton: {}, conductor: mockConductor };
      
      // Act: Beat 1 - showSelectionOverlay derives ID and returns it
      const overlayResult = selectHandlers.showSelectionOverlay({ event: mockEvent }, ctx);
      expect(overlayResult).toEqual({ id: "rx-node-abc" });
      
      // Simulate baton merge after Beat 1
      const ctxWithBaton = { 
        ...ctx, 
        baton: { ...ctx.baton, ...overlayResult } 
      };
      
      // Act: Beat 2 - notifyUi with empty data (relies on baton)
      selectHandlers.notifyUi({}, ctxWithBaton);
      
      // Act: Beat 3 - publishSelectionChanged with empty data (relies on baton)
      await selectHandlers.publishSelectionChanged({}, ctxWithBaton);
      
      // Assert: conductor.play called with ControlPanelPlugin/control-panel-selection-show-symphony and { id }
      expect(mockConductor.play).toHaveBeenCalledWith(
        "ControlPanelPlugin",
        "control-panel-selection-show-symphony",
        { id: "rx-node-abc" }
      );
      
      // Assert: EventRouter.publish called with "canvas.component.selection.changed", { id }, conductor
      expect(EventRouter.publish).toHaveBeenCalledWith(
        "canvas.component.selection.changed",
        { id: "rx-node-abc" },
        mockConductor
      );
    });

    it("should handle container component selection", async () => {
      // Arrange: DOM element <div id="rx-node-def" class="rx-comp rx-container">
      const containerElement = document.getElementById("rx-node-def");
      const mockEvent = { target: containerElement };
      
      const ctx = { baton: {}, conductor: mockConductor };
      
      // Act: Full selection flow
      const overlayResult = selectHandlers.showSelectionOverlay({ event: mockEvent }, ctx);
      const ctxWithBaton = { ...ctx, baton: { ...ctx.baton, ...overlayResult } };
      
      selectHandlers.notifyUi({}, ctxWithBaton);
      await selectHandlers.publishSelectionChanged({}, ctxWithBaton);
      
      // Assert: Both play and publish called with correct ID
      expect(mockConductor.play).toHaveBeenCalledWith(
        "ControlPanelPlugin",
        "control-panel-selection-show-symphony",
        { id: "rx-node-def" }
      );
      
      expect(EventRouter.publish).toHaveBeenCalledWith(
        "canvas.component.selection.changed",
        { id: "rx-node-def" },
        mockConductor
      );
    });

    it("should work when data.id is provided directly", async () => {
      // Arrange: Direct ID in data (no DOM derivation needed)
      const ctx = { baton: {}, conductor: mockConductor };
      
      // Act: Beat 1 with direct ID
      const overlayResult = selectHandlers.showSelectionOverlay({ id: "rx-node-abc" }, ctx);
      const ctxWithBaton = { ...ctx, baton: { ...ctx.baton, ...overlayResult } };
      
      // Act: Beat 2 with direct ID (should use data.id, not baton)
      selectHandlers.notifyUi({ id: "rx-node-abc" }, ctxWithBaton);
      
      // Act: Beat 3 (uses baton)
      await selectHandlers.publishSelectionChanged({}, ctxWithBaton);
      
      // Assert: Both calls made with correct ID
      expect(mockConductor.play).toHaveBeenCalledWith(
        "ControlPanelPlugin",
        "control-panel-selection-show-symphony",
        { id: "rx-node-abc" }
      );
      
      expect(EventRouter.publish).toHaveBeenCalledWith(
        "canvas.component.selection.changed",
        { id: "rx-node-abc" },
        mockConductor
      );
    });
  });

  describe("SVG selection regression check", () => {
    it("should handle SVG component selection without breaking existing behavior", async () => {
      // Arrange: SVG element
      const svgElement = document.getElementById("rx-node-ghi");
      const mockEvent = { target: svgElement };
      
      const ctx = { baton: {}, conductor: mockConductor };
      
      // Act: Full selection flow
      const overlayResult = selectHandlers.showSelectionOverlay({ event: mockEvent }, ctx);
      const ctxWithBaton = { ...ctx, baton: { ...ctx.baton, ...overlayResult } };
      
      selectHandlers.notifyUi({}, ctxWithBaton);
      await selectHandlers.publishSelectionChanged({}, ctxWithBaton);
      
      // Assert: SVG selection works the same as non-SVG
      expect(mockConductor.play).toHaveBeenCalledWith(
        "ControlPanelPlugin",
        "control-panel-selection-show-symphony",
        { id: "rx-node-ghi" }
      );
      
      expect(EventRouter.publish).toHaveBeenCalledWith(
        "canvas.component.selection.changed",
        { id: "rx-node-ghi" },
        mockConductor
      );
    });
  });

  describe("Conductor scenarios", () => {
    it("should use useConductor fallback for notifyUi when ctx.conductor is missing", async () => {
      const mockUseConductorResult = { play: vi.fn() };
      (useConductor as any).mockReturnValue(mockUseConductorResult);

      // Arrange: No conductor in context
      const ctx = { baton: { id: "rx-node-abc" } }; // no conductor

      // Act: notifyUi should use useConductor fallback
      selectHandlers.notifyUi({}, ctx);

      // Assert: useConductor was called for notifyUi
      expect(useConductor).toHaveBeenCalled();

      // Assert: fallback conductor was used for notifyUi
      expect(mockUseConductorResult.play).toHaveBeenCalledWith(
        "ControlPanelPlugin",
        "control-panel-selection-show-symphony",
        { id: "rx-node-abc" }
      );
    });

    it("should pass undefined conductor for publishSelectionChanged when ctx.conductor is missing", async () => {
      // Arrange: No conductor in context (matches SVG node pattern)
      const ctx = { baton: { id: "rx-node-abc" } }; // no conductor

      // Act: publishSelectionChanged should pass undefined conductor (like SVG node pattern)
      await selectHandlers.publishSelectionChanged({}, ctx);

      // Assert: EventRouter.publish called with undefined conductor (correct behavior)
      expect(EventRouter.publish).toHaveBeenCalledWith(
        "canvas.component.selection.changed",
        { id: "rx-node-abc" },
        undefined
      );
    });

    it("should handle EventRouter.publish with undefined conductor gracefully", async () => {
      const ctx = { baton: { id: "rx-node-abc" } };

      // Act: Should not throw when conductor is undefined
      expect(async () => {
        await selectHandlers.publishSelectionChanged({}, ctx);
      }).not.toThrow();

      // Assert: EventRouter.publish called with undefined conductor
      expect(EventRouter.publish).toHaveBeenCalledWith(
        "canvas.component.selection.changed",
        { id: "rx-node-abc" },
        undefined
      );
    });
  });

  describe("Robust overlay dataset fallback", () => {
    it("should use overlay dataset as fallback when baton/data are empty", async () => {
      // Arrange: Create overlay with dataset (simulates Beat 1 having run)
      const overlay = document.createElement("div");
      overlay.id = "rx-selection-overlay";
      overlay.dataset.targetId = "rx-node-fallback123";
      document.body.appendChild(overlay);

      const ctx = { baton: {}, conductor: mockConductor }; // no id in baton or data

      // Act: Both handlers should use overlay dataset fallback
      selectHandlers.notifyUi({}, ctx);
      await selectHandlers.publishSelectionChanged({}, ctx);

      // Assert: Both should work with fallback ID
      expect(mockConductor.play).toHaveBeenCalledWith(
        "ControlPanelPlugin",
        "control-panel-selection-show-symphony",
        { id: "rx-node-fallback123" }
      );

      expect(EventRouter.publish).toHaveBeenCalledWith(
        "canvas.component.selection.changed",
        { id: "rx-node-fallback123" },
        mockConductor
      );

      // Cleanup
      document.body.removeChild(overlay);
    });

    it("should prefer baton ID over overlay dataset when both are available", async () => {
      // Arrange: Both baton and overlay have IDs
      const overlay = document.createElement("div");
      overlay.id = "rx-selection-overlay";
      overlay.dataset.targetId = "rx-node-overlay";
      document.body.appendChild(overlay);

      const ctx = { baton: { id: "rx-node-baton" }, conductor: mockConductor };

      // Act
      await selectHandlers.publishSelectionChanged({}, ctx);

      // Assert: Should prefer baton ID
      expect(EventRouter.publish).toHaveBeenCalledWith(
        "canvas.component.selection.changed",
        { id: "rx-node-baton" },
        mockConductor
      );

      // Cleanup
      document.body.removeChild(overlay);
    });

    it("should handle missing overlay gracefully", async () => {
      // Arrange: No overlay exists, no baton ID
      const ctx = { baton: {}, conductor: mockConductor };

      // Act: Should not throw
      expect(() => {
        selectHandlers.notifyUi({}, ctx);
      }).not.toThrow();

      expect(async () => {
        await selectHandlers.publishSelectionChanged({}, ctx);
      }).not.toThrow();

      // Assert: Should not call play or publish when no ID is available anywhere
      expect(mockConductor.play).not.toHaveBeenCalled();
      expect(EventRouter.publish).not.toHaveBeenCalled();
    });
  });

  describe("Edge cases and error handling", () => {
    it("should handle missing ID gracefully", async () => {
      const ctx = { baton: {}, conductor: mockConductor };

      // Act: No ID available anywhere
      const overlayResult = selectHandlers.showSelectionOverlay({}, ctx);
      selectHandlers.notifyUi({}, ctx);
      await selectHandlers.publishSelectionChanged({}, ctx);

      // Assert: No calls made when ID is missing
      expect(overlayResult).toEqual({});
      expect(mockConductor.play).not.toHaveBeenCalled();
      expect(EventRouter.publish).not.toHaveBeenCalled();
    });

    it("should handle EventRouter.publish errors gracefully", async () => {
      (EventRouter.publish as any).mockImplementationOnce(() => {
        throw new Error("EventRouter error");
      });

      const ctx = { baton: { id: "rx-node-abc" }, conductor: mockConductor };

      // Act: Should not throw despite EventRouter error
      expect(async () => {
        await selectHandlers.publishSelectionChanged({}, ctx);
      }).not.toThrow();
    });
  });
});
