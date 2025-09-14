/* @vitest-environment jsdom */
import { describe, it, expect, beforeEach } from "vitest";
import { handlers } from "@renderx-plugins/canvas-component/symphonies/create/create.symphony.ts";

function makeTemplate() {
  return {
    tag: "button",
    text: "Click Me",
    classes: ["rx-comp", "rx-button"],
    css: ".rx-button { padding: 8px 16px; border: none; border-radius: 4px; font-size: 14px; background-color: var(--bg-color); color: var(--text-color); }",
    cssVariables: { "bg-color": "#007acc", "text-color": "#ffffff" },
    dimensions: { width: 120, height: 40 },
  };
}

function makeCtx() {
  return { payload: {} } as any; // No stageCrew — we want DOM-only behavior
}

describe("canvas-component create beat (DOM-only)", () => {
  beforeEach(() => {
    // Host container used by Canvas
    document.body.innerHTML = '<div id="rx-canvas"></div>';
  });

  it("creates a single element under #rx-canvas with text, position and dimensions", () => {
    const ctx: any = makeCtx();
    const template = makeTemplate();

    handlers.resolveTemplate({ component: { template } } as any, ctx);
    handlers.createNode({ position: { x: 50, y: 80 } } as any, ctx);

    const btn = document.querySelector(
      "#rx-canvas button"
    ) as HTMLButtonElement | null;
    expect(btn).toBeTruthy(); // should exist
    expect(btn!.id).toMatch(/^rx-node-/);
    expect(btn!.className).toContain("rx-button");
    expect(btn!.textContent).toBe("Click Me");

    const style = (btn as HTMLElement).style as CSSStyleDeclaration;
    expect(style.position).toBe("absolute");
    expect(style.left).toBe("50px");
    expect(style.top).toBe("80px");
    expect(style.width).toBe("120px");
    expect(style.height).toBe("40px");

    const styleTag = document.getElementById("rx-components-styles");
    expect(styleTag).toBeTruthy();
  });
});

