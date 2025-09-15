import { describe, it, expect, beforeEach } from "vitest";
import { collectCssClasses } from "@renderx-plugins/canvas-component/symphonies/export/export.css.stage-crew.ts";
import { cssRegistry } from "../src/temp-deps/css-registry.store.ts";

describe("Debug CSS collection in export (migrated)", () => {
  beforeEach(() => {
    // Log current registry state (kept for parity with original test intent)
    console.log("CSS Registry state before test:");
    console.log("- Has rx-button:", cssRegistry.hasClass("rx-button"));
    console.log("- Has rx-comp:", cssRegistry.hasClass("rx-comp"));
    console.log("- All class names:", cssRegistry.getClassNames());
  });

  it("debugs why cssClasses is not empty in export when classRefs provided", () => {
    const ctx: any = {
      payload: {
        components: [
          {
            id: "rx-node-et5orq",
            type: "button",
            template: {
              tag: "button",
              classRefs: ["rx-comp", "rx-button", "rx-comp-button-et5orq"],
              style: {}
            }
          }
        ]
      },
      logger: {
        info: (msg: string) => console.log("INFO:", msg),
        error: (msg: string) => console.log("ERROR:", msg)
      }
    };

    collectCssClasses({}, ctx);

    expect(Object.keys(ctx.payload.cssClasses || {}).length).toBeGreaterThan(0);
  });
});

