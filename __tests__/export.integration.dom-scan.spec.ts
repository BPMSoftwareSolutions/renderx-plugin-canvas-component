/* @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { queryAllComponents } from "@renderx-plugins/canvas-component/symphonies/export/export.io.ts";
import { collectLayoutData } from "@renderx-plugins/canvas-component/symphonies/export/export.stage-crew.ts";
import { buildUiFileContent } from "@renderx-plugins/canvas-component/symphonies/export/export.pure.ts";

function makeIntegrationCtx() {
  const ops: any[] = [];
  return {
    payload: {},
    io: {
      kv: { getAll: async () => [] },
    },
    _ops: ops,
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  } as any;
}

describe("canvas-component export integration (DOM scan fallback)", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id=\"rx-canvas\" style=\"position: relative; width: 833px; height: 629px;\">
        <button id=\"rx-node-btn-1\" class=\"rx-comp rx-button\" style=\"position: absolute; left: 116px; top: 77px; width: 120px; height: 40px; padding: 8px 12px; border-radius: 8px; background: #0ea5e9; color: white;\">Save Document</button>
        <div id=\"rx-node-container-1\" class=\"rx-comp rx-container\" style=\"position: absolute; left: 168px; top: 270px; width: 354px; height: 237px; border: 2px dashed #3b82f6;\">
          <button id=\"rx-node-btn-2\" class=\"rx-comp rx-button\" style=\"position: absolute; left: 197px; top: 298px; width: 120px; height: 40px; padding: 8px 12px; border-radius: 8px; background: #0ea5e9; color: white;\">Click me</button>
          <input id=\"rx-node-input-1\" class=\"rx-comp rx-input\" type=\"email\" value=\"user@test.com\" style=\"position: absolute; left: 199px; top: 362px; width: 220px; height: 32px; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px;\" placeholder=\"Enter your email address\">
        </div>
      </div>
    `;
  });

  it("should fallback to DOM scanning when KV store is empty but components exist in DOM", async () => {
    const ctx = makeIntegrationCtx();

    await queryAllComponents({}, ctx);
    collectLayoutData({}, ctx);
    buildUiFileContent({}, ctx);

    expect(ctx.payload.components).toHaveLength(4);
    expect(ctx.payload.uiFileContent.components).toHaveLength(4);

    const buttonComponent = ctx.payload.uiFileContent.components.find((c: any) => c.id === "rx-node-btn-1");
    expect(buttonComponent).toMatchObject({
      id: "rx-node-btn-1",
      type: "button",
      template: { tag: "button", classRefs: ["rx-comp", "rx-button"] },
      layout: { x: 116, y: 77, width: 120, height: 40 },
    });

    const inputComponent = ctx.payload.uiFileContent.components.find((c: any) => c.id === "rx-node-input-1");
    expect(inputComponent).toBeDefined();
    expect(inputComponent.content).toBeDefined();
    expect(inputComponent.content.placeholder).toBe("Enter your email address");
    expect(inputComponent.content.value).toBe("user@test.com");
    expect(inputComponent.content.inputType).toBe("email");
  });
});

