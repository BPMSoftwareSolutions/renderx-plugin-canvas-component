/* @vitest-environment jsdom */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock host SDK with spy for EventRouter.publish
vi.mock("@renderx-plugins/host-sdk", () => ({
  EventRouter: {
    publish: vi.fn().mockResolvedValue(undefined),
  },
  resolveInteraction: (key: string) => ({ pluginId: "CanvasComponentPlugin", sequenceId: key }),
}));

import { EventRouter } from "@renderx-plugins/host-sdk";
import { createPastedComponent } from "../src/symphonies/paste/paste.stage-crew";

describe("paste interactions attach and publish drag events", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("attaches onDragMove to payload passed into canvas.component.create and publishes {id, position}", async () => {
    const clipboardComponent = {
      template: { tag: "div", classes: ["rx-comp"], style: {} },
      position: { x: 1, y: 2 },
    };

    let capturedPayload: any = null;
    const conductor = { play: vi.fn((_p, _s, payload) => { capturedPayload = payload; }) };
    const ctx: any = { conductor, logger: { info: vi.fn(), warn: vi.fn() } };

    // Act: call paste creation
    await createPastedComponent({ clipboardData: { component: clipboardComponent }, newPosition: { x: 10, y: 20 } }, ctx);

    // Assert: payload should exist and have interaction callbacks attached
    expect(capturedPayload).toBeTruthy();
    expect(typeof capturedPayload.onDragMove).toBe("function");

    // Simulate drag move callback and ensure it publishes id+position
    const id = "rx-node-123";
    // The onDragMove receives info with id+position from create.interactions.attachDrag
    capturedPayload.onDragMove({ id, position: { x: 42, y: 84 }, delta: { x: 5, y: 5 } });

    expect(EventRouter.publish).toHaveBeenCalledWith(
      "canvas.component.drag.move",
      { id, position: { x: 42, y: 84 } },
      ctx.conductor
    );
  });
});

