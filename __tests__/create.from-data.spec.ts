/* @vitest-environment jsdom */
import { describe, it, expect } from "vitest";
import { toCreatePayloadFromData, transformClipboardToCreatePayload } from "../src/symphonies/create/create.from-import";

describe("toCreatePayloadFromData (clipboard shape)", () => {
  it("builds create payload from clipboard-shaped component without preserving id", () => {
    const clip = {
      id: "btn-1",
      template: { tag: "button", classes: ["rx-comp", "rx-button"], style: { color: "red" } },
      position: { x: 5, y: 7 },
    } as any;
    const out = toCreatePayloadFromData(clip);
    expect(out.component?.template?.tag).toBe("button");
    expect(out.position).toEqual({ x: 5, y: 7 });
    expect((out as any)._overrideNodeId).toBeUndefined();
  });
});

describe("transformClipboardToCreatePayload", () => {
  it("maps template/position straight through", () => {
    const clip = { template: { tag: "div", classes: ["rx-comp"] }, position: { x: 0, y: 0 } } as any;
    const out = transformClipboardToCreatePayload(clip);
    expect(out.component?.template?.tag).toBe("div");
    expect(out.position).toEqual({ x: 0, y: 0 });
  });

  it("handles renderx-component wrapper structure", () => {
    const clipboardWrapper = {
      type: "renderx-component",
      version: "1.0",
      component: {
        template: { tag: "button", classes: ["rx-button"], text: "Click me" },
        position: { x: 50, y: 75 }
      }
    };
    const out = transformClipboardToCreatePayload(clipboardWrapper);
    expect(out.component.template).toEqual({ tag: "button", classes: ["rx-button"], text: "Click me" });
    expect(out.position).toEqual({ x: 50, y: 75 });
  });
});

