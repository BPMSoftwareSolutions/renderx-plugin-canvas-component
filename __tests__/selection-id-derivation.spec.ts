import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { JSDOM } from "jsdom";
import { EventRouter } from "@renderx-plugins/host-sdk";
import { handlers as selectHandlers } from "../src/symphonies/select/select.stage-crew";

// Mock EventRouter
vi.mock("@renderx-plugins/host-sdk", () => ({
  EventRouter: {
    publish: vi.fn(),
  },
  useConductor: vi.fn(() => ({ play: vi.fn() })),
  isFlagEnabled: vi.fn(() => false),
}));

describe("Selection ID derivation and baton flow", () => {
  let dom: JSDOM;
  let mockConductor: any;

  beforeEach(() => {
    // Set up DOM environment
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <body>
          <div id="rx-canvas" style="position: relative; width: 800px; height: 600px;">
            <div id="rx-node-button123" class="rx-comp rx-button">Button Component</div>
            <div id="rx-node-div456" class="rx-comp rx-container">Container Component</div>
            <svg id="rx-node-svg789" class="rx-comp rx-line">
              <line x1="0" y1="0" x2="100" y2="100" />
            </svg>
            <div class="nested-container">
              <button id="rx-node-nested999" class="rx-comp rx-button">Nested Button</button>
            </div>
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

  describe("showSelectionOverlay ID derivation", () => {
    it("derives ID from data.id when present", () => {
      const data = { id: "rx-node-button123" };
      const ctx = { conductor: mockConductor };

      const result = selectHandlers.showSelectionOverlay(data, ctx);

      expect(result).toEqual({ id: "rx-node-button123" });
    });

    it("derives ID from data.elementId when data.id is missing", () => {
      const data = { elementId: "rx-node-div456" };
      const ctx = { conductor: mockConductor };

      const result = selectHandlers.showSelectionOverlay(data, ctx);

      expect(result).toEqual({ id: "rx-node-div456" });
    });

    it("derives ID from DOM target when data.id and data.elementId are missing", () => {
      const buttonElement = document.getElementById("rx-node-button123");
      const mockEvent = {
        target: buttonElement,
      };
      const data = { event: mockEvent };
      const ctx = { conductor: mockConductor };

      const result = selectHandlers.showSelectionOverlay(data, ctx);

      expect(result).toEqual({ id: "rx-node-button123" });
    });

    it("derives ID from nested DOM target using closest('.rx-comp')", () => {
      const nestedButton = document.getElementById("rx-node-nested999");
      const mockEvent = {
        target: nestedButton,
      };
      const data = { event: mockEvent };
      const ctx = { conductor: mockConductor };

      const result = selectHandlers.showSelectionOverlay(data, ctx);

      expect(result).toEqual({ id: "rx-node-nested999" });
    });

    it("returns empty object when no ID can be derived", () => {
      const data = { event: { target: document.body } }; // body has no rx-comp class
      const ctx = { conductor: mockConductor };

      const result = selectHandlers.showSelectionOverlay(data, ctx);

      expect(result).toEqual({});
    });

    it("returns empty object when element with derived ID doesn't exist in DOM", () => {
      const data = { id: "rx-node-nonexistent" };
      const ctx = { conductor: mockConductor };

      const result = selectHandlers.showSelectionOverlay(data, ctx);

      expect(result).toEqual({});
    });
  });

  describe("notifyUi with baton fallback", () => {
    it("uses data.id when present", () => {
      const data = { id: "rx-node-button123" };
      const ctx = { conductor: mockConductor, baton: {} };

      selectHandlers.notifyUi(data, ctx);

      expect(mockConductor.play).toHaveBeenCalledWith(
        "ControlPanelPlugin",
        "control-panel-selection-show-symphony",
        { id: "rx-node-button123" }
      );
    });

    it("falls back to ctx.baton.id when data.id is missing", () => {
      const data = {};
      const ctx = { 
        conductor: mockConductor, 
        baton: { id: "rx-node-div456" } 
      };

      selectHandlers.notifyUi(data, ctx);

      expect(mockConductor.play).toHaveBeenCalledWith(
        "ControlPanelPlugin",
        "control-panel-selection-show-symphony",
        { id: "rx-node-div456" }
      );
    });

    it("falls back to ctx.baton.elementId when data.id and baton.id are missing", () => {
      const data = {};
      const ctx = { 
        conductor: mockConductor, 
        baton: { elementId: "rx-node-svg789" } 
      };

      selectHandlers.notifyUi(data, ctx);

      expect(mockConductor.play).toHaveBeenCalledWith(
        "ControlPanelPlugin",
        "control-panel-selection-show-symphony",
        { id: "rx-node-svg789" }
      );
    });

    it("falls back to ctx.baton.selectedId when other IDs are missing", () => {
      const data = {};
      const ctx = { 
        conductor: mockConductor, 
        baton: { selectedId: "rx-node-nested999" } 
      };

      selectHandlers.notifyUi(data, ctx);

      expect(mockConductor.play).toHaveBeenCalledWith(
        "ControlPanelPlugin",
        "control-panel-selection-show-symphony",
        { id: "rx-node-nested999" }
      );
    });

    it("does not call play when no ID is available", () => {
      const data = {};
      const ctx = { conductor: mockConductor, baton: {} };

      selectHandlers.notifyUi(data, ctx);

      expect(mockConductor.play).not.toHaveBeenCalled();
    });
  });

  describe("publishSelectionChanged with baton", () => {
    it("publishes topic with baton.id", async () => {
      const ctx = { conductor: mockConductor, baton: { id: "rx-node-button123" } };

      await selectHandlers.publishSelectionChanged({}, ctx);

      expect(EventRouter.publish).toHaveBeenCalledWith(
        "canvas.component.selection.changed",
        { id: "rx-node-button123" },
        mockConductor
      );
    });

    it("publishes topic with baton.elementId when baton.id is missing", async () => {
      const ctx = { conductor: mockConductor, baton: { elementId: "rx-node-div456" } };

      await selectHandlers.publishSelectionChanged({}, ctx);

      expect(EventRouter.publish).toHaveBeenCalledWith(
        "canvas.component.selection.changed",
        { id: "rx-node-div456" },
        mockConductor
      );
    });

    it("publishes topic with baton.selectedId when other IDs are missing", async () => {
      const ctx = { conductor: mockConductor, baton: { selectedId: "rx-node-svg789" } };

      await selectHandlers.publishSelectionChanged({}, ctx);

      expect(EventRouter.publish).toHaveBeenCalledWith(
        "canvas.component.selection.changed",
        { id: "rx-node-svg789" },
        mockConductor
      );
    });

    it("does not publish when no ID is available in baton", async () => {
      const ctx = { conductor: mockConductor, baton: {} };

      await selectHandlers.publishSelectionChanged({}, ctx);

      expect(EventRouter.publish).not.toHaveBeenCalled();
    });
  });

  describe("End-to-end selection flow", () => {
    it("works for button component selection via DOM target", () => {
      const buttonElement = document.getElementById("rx-node-button123");
      const mockEvent = { target: buttonElement };
      
      // Beat 1: showSelectionOverlay derives ID and returns it
      const data = { event: mockEvent };
      const ctx = { conductor: mockConductor, baton: {} };
      
      const overlayResult = selectHandlers.showSelectionOverlay(data, ctx);
      expect(overlayResult).toEqual({ id: "rx-node-button123" });
      
      // Beat 2: notifyUi uses baton.id (merged from beat 1 result)
      const ctxWithBaton = { 
        conductor: mockConductor, 
        baton: { ...ctx.baton, ...overlayResult } 
      };
      
      selectHandlers.notifyUi({}, ctxWithBaton);
      expect(mockConductor.play).toHaveBeenCalledWith(
        "ControlPanelPlugin",
        "control-panel-selection-show-symphony",
        { id: "rx-node-button123" }
      );
    });

    it("works for SVG component selection", async () => {
      const svgElement = document.getElementById("rx-node-svg789");
      const mockEvent = { target: svgElement };
      
      // Beat 1: showSelectionOverlay derives ID and returns it
      const data = { event: mockEvent };
      const ctx = { conductor: mockConductor, baton: {} };
      
      const overlayResult = selectHandlers.showSelectionOverlay(data, ctx);
      expect(overlayResult).toEqual({ id: "rx-node-svg789" });
      
      // Beat 2: notifyUi uses baton.id
      const ctxWithBaton = { 
        conductor: mockConductor, 
        baton: { ...ctx.baton, ...overlayResult } 
      };
      
      selectHandlers.notifyUi({}, ctxWithBaton);
      expect(mockConductor.play).toHaveBeenCalledWith(
        "ControlPanelPlugin",
        "control-panel-selection-show-symphony",
        { id: "rx-node-svg789" }
      );
      
      // Beat 3: publishSelectionChanged uses baton.id
      await selectHandlers.publishSelectionChanged({}, ctxWithBaton);
      expect(EventRouter.publish).toHaveBeenCalledWith(
        "canvas.component.selection.changed",
        { id: "rx-node-svg789" },
        mockConductor
      );
    });
  });
});
