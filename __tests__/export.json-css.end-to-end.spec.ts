/* @vitest-environment jsdom */
import { describe, it, expect, beforeEach } from "vitest";
import { queryAllComponents } from "@renderx-plugins/canvas-component/symphonies/export/export.io.ts";
import { collectCssClasses } from "@renderx-plugins/canvas-component/symphonies/export/export.css.stage-crew.ts";
import { collectLayoutData } from "@renderx-plugins/canvas-component/symphonies/export/export.stage-crew.ts";
import { buildUiFileContent } from "@renderx-plugins/canvas-component/symphonies/export/export.pure.ts";
import { cssRegistry } from "../src/temp-deps/css-registry.store.ts";

function setupCanvas() {
  const canvas = document.createElement("div");
  canvas.id = "rx-canvas";
  canvas.style.cssText = "position: absolute; left: 0; top: 0; width: 1200px; height: 800px;";
  document.body.innerHTML = "";
  document.body.appendChild(canvas);
}

describe("Export includes JSON component CSS end-to-end (migrated)", () => {
  beforeEach(() => {
    setupCanvas();
  });

  it("exports CSS classes from registry in the UI file", async () => {
    // 1. Manually register JSON component CSS (simulating what library load should do)
    const jsonButtonCss =
      ".rx-button { background-color: var(--bg-color); color: var(--text-color); } .rx-button--primary { --bg-color: #007bff; --text-color: #ffffff; } .rx-button--secondary { --bg-color: #6c757d; --text-color: #ffffff; }";
    cssRegistry.updateClass("rx-button", jsonButtonCss);

    // 2. Verify CSS was registered
    const buttonClass = cssRegistry.getClass("rx-button");
    expect(buttonClass).toBeDefined();
    expect(buttonClass?.content || "").toContain(".rx-button--primary");

    // 3. Run export flow
    const ctx: any = { payload: {}, io: { kv: { getAll: async () => [
      { id: "rx-node-1", type: "button", classes: ["rx-comp", "rx-button"], style: {}, createdAt: Date.now() }
    ] } }, logger: { info: () => {}, warn: () => {}, error: () => {} } };

    await queryAllComponents({}, ctx);
    expect(ctx.payload.components).toHaveLength(1);

    collectCssClasses({}, ctx);
    expect(ctx.payload.cssClasses).toBeDefined();
    expect(ctx.payload.cssClasses["rx-button"]).toBeDefined();

    collectLayoutData({}, ctx);
    buildUiFileContent({}, ctx);

    const uiFile = ctx.payload.uiFileContent;
    expect(uiFile).toBeDefined();
    expect(uiFile.cssClasses).toBeDefined();
    expect(uiFile.cssClasses["rx-button"]).toBeDefined();
    expect(uiFile.components).toHaveLength(1);
    expect(uiFile.components[0].template.classRefs).toContain("rx-button");
  });
});

