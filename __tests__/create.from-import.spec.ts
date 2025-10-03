/* @vitest-environment jsdom */
import { describe, it, expect } from "vitest";
import { transformImportToCreatePayload } from "../src/symphonies/create/create.from-import";

describe("transformImportToCreatePayload", () => {
  it("maps import record to create payload with template, position, container and override id", () => {
    const rec = {
      id: "btn-1",
      tag: "button",
      classRefs: ["rx-comp", "rx-button", "rx-container"],
      style: { color: "red" },
      cssVariables: { "--x": "1" },
      css: ".rx-button{color:red}",
      content: { text: "Click", content: "Click" },
      layout: { x: 10, y: 20, width: 120, height: 40 },
      parentId: "container-1",
    } as any;

    const out = transformImportToCreatePayload(rec);
    expect(out._overrideNodeId).toBe("btn-1");
    expect(out.containerId).toBe("container-1");
    expect(out.position).toEqual({ x: 10, y: 20 });
    expect(out.component?.template?.tag).toBe("button");
    expect(out.component?.template?.classes).toContain("rx-button");
    expect(out.component?.template?.style).toEqual({ color: "red" });
    expect(out.component?.template?.text).toBe("Click");
    expect(out.component?.template?.cssVariables).toEqual({ "--x": "1" });
    expect(out.component?.template?.css).toContain(".rx-button");
    expect(out.component?.template?.dimensions).toEqual({ width: 120, height: 40 });
    expect(out.component?.template?.attributes?.["data-role"]).toBe("container");
  });

  it("handles minimal shapes without optional fields", () => {
    const rec = {
      id: "div-1",
      tag: "div",
      classRefs: ["rx-comp"],
      layout: { x: 0, y: 0 },
    } as any;
    const out = transformImportToCreatePayload(rec);
    expect(out._overrideNodeId).toBe("div-1");
    expect(out.containerId).toBeUndefined();
    expect(out.position).toEqual({ x: 0, y: 0 });
    expect(out.component?.template?.tag).toBe("div");
    expect(out.component?.template?.classes).toContain("rx-comp");
    expect(out.component?.template?.style).toEqual({});
    expect(out.component?.template?.dimensions).toBeUndefined();
  });
});

