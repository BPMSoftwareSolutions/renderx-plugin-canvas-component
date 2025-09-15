/* @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock host SDK with spy for EventRouter.publish
vi.mock("@renderx-plugins/host-sdk", () => ({
  EventRouter: {
    publish: vi.fn().mockResolvedValue(undefined),
  },
  resolveInteraction: (key: string) => {
    if (key === "control.panel.selection.show") {
      return {
        pluginId: "ControlPanelPlugin",
        sequenceId: "control-panel-selection-show-symphony",
      };
    }
    return { pluginId: "noop", sequenceId: key } as any;
  },
  isFlagEnabled: () => false,
  useConductor: () => ({ play: () => {} }),
}));

// Import from package's own select handlers
import { handlers as selectHandlers } from "../src/symphonies/select/select.stage-crew.ts";
import { EventRouter } from "@renderx-plugins/host-sdk";

describe("Canvas selection publishes selection.changed topic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("publishes canvas.component.selection.changed when publishSelectionChanged handler is called", async () => {
    const conductor = { play: vi.fn() };
    const ctx = { conductor, baton: { id: "rx-node-abc123" } };

    // Act: trigger canvas selection publishSelectionChanged handler
    await selectHandlers.publishSelectionChanged({}, ctx);

    // Assert: should publish selection.changed topic
    expect(EventRouter.publish).toHaveBeenCalledWith(
      "canvas.component.selection.changed",
      { id: "rx-node-abc123" },
      conductor
    );
  });

  it("publishes selection.changed with elementId from baton when id is missing", async () => {
    const conductor = { play: vi.fn() };
    const ctx = { conductor, baton: { elementId: "rx-node-from-elementId" } }; // no id, but has elementId

    // Act: trigger canvas selection publishSelectionChanged handler
    await selectHandlers.publishSelectionChanged({}, ctx);

    // Assert: should use elementId from baton
    expect(EventRouter.publish).toHaveBeenCalledWith(
      "canvas.component.selection.changed",
      { id: "rx-node-from-elementId" },
      conductor
    );
  });

  it("publishes selection.changed with selectedId from baton when id and elementId are missing", async () => {
    const conductor = { play: vi.fn() };
    const ctx = { conductor, baton: { selectedId: "rx-node-from-selectedId" } }; // no id or elementId, but has selectedId

    // Act: trigger canvas selection publishSelectionChanged handler
    await selectHandlers.publishSelectionChanged({}, ctx);

    // Assert: should use selectedId from baton
    expect(EventRouter.publish).toHaveBeenCalledWith(
      "canvas.component.selection.changed",
      { id: "rx-node-from-selectedId" },
      conductor
    );
  });

  it("does not publish when no id is available", async () => {
    const conductor = { play: vi.fn() };
    const ctx = { conductor, baton: {} }; // no id, elementId, or selectedId

    // Act: trigger canvas selection publishSelectionChanged handler
    await selectHandlers.publishSelectionChanged({}, ctx);

    // Assert: should not publish anything
    expect(EventRouter.publish).not.toHaveBeenCalled();
  });

  it("handles missing conductor gracefully (matches SVG node pattern)", async () => {
    const ctx = { baton: { id: "rx-node-abc123" } }; // no conductor

    expect(async () => {
      await selectHandlers.publishSelectionChanged({}, ctx);
    }).not.toThrow();

    // Should publish with undefined conductor (matches SVG node selection pattern)
    expect(EventRouter.publish).toHaveBeenCalledWith(
      "canvas.component.selection.changed",
      { id: "rx-node-abc123" },
      undefined
    );
  });

  it("handles EventRouter.publish errors gracefully", async () => {
    (EventRouter.publish as any).mockImplementationOnce(() => {
      throw new Error("EventRouter error");
    });

    const conductor = { play: vi.fn() };
    const ctx = { conductor, baton: { id: "rx-node-abc123" } };

    expect(async () => {
      await selectHandlers.publishSelectionChanged({}, ctx);
    }).not.toThrow();
  });
});
