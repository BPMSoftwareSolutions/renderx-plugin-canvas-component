/* @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { parseUiFile } from "@renderx-plugins/canvas-component/symphonies/import/import.parse.pure.ts";

function setupCanvas() {
  const root = document.createElement("div");
  root.innerHTML = `<div id="rx-canvas" style="position:absolute; left:0; top:0; width:1200px; height:800px;"></div>`;
  document.body.innerHTML = "";
  document.body.appendChild(root);
}

function makeCtx() {
  const ops: any[] = [];
  return {
    payload: {},
    io: {
      kv: {
        put: vi.fn(async (...a: any[]) => ops.push(["kv.put", ...a])),
      },
    },
    logger: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
    conductor: {
      play: vi.fn(async (pluginId: string, sequenceId: string, data: any) => {
        ops.push(["conductor.play", pluginId, sequenceId, data]);
      }),
    },
    _ops: ops,
  } as any;
}

describe("import.parse adds default base classes", () => {
  beforeEach(() => {
    setupCanvas();
  });

  it("adds rx-comp and rx-<type> when missing from classRefs", async () => {
    const ctx = makeCtx();
    const ui = {
      version: "1.0.0",
      metadata: {},
      cssClasses: {},
      components: [
        {
          id: "btn-x",
          type: "button",
          template: {
            tag: "button",
            classRefs: ["rx-button--primary"],
            style: {},
          },
          layout: { x: 0, y: 0, width: 100, height: 40 },
        },
      ],
    } as any;

    ctx.payload.uiFileContent = ui;

    await parseUiFile({}, ctx);

    const comps = ctx.payload.importComponents || [];
    expect(comps.length).toBe(1);
    expect(comps[0].type).toBe("button");
    expect(comps[0].classRefs).toEqual([
      "rx-comp",
      "rx-button",
      "rx-button--primary",
    ]);
  });
});

