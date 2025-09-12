import { describe, it, expect } from "vitest";
import path from "node:path";
import { ESLint } from "eslint";

const cwd = path.resolve(__dirname, "..");

describe("@renderx-plugins/canvas-component: allowed-imports rule", () => {
  it("allows relative and approved bare imports", async () => {
    const eslint = new ESLint({ cwd });
    const code = [
      "import x from './local';",
      "import { useConductor } from '@renderx-plugins/host-sdk';",
      "import React from 'react';",
      "import 'gif.js.optimized';",
    ].join("\n");
    const [{ errorCount, messages }] = await eslint.lintText(code, {
      filePath: path.join(cwd, "src", "ok.ts"),
    });
    const ruleErrors = messages.filter((m) => String(m.ruleId).includes("allowed-imports/only-allowed"));
    expect(ruleErrors.length).toBe(0);
    expect(errorCount).toBe(0);
  }, 30000);

  it("flags disallowed bare imports", async () => {
    const eslint = new ESLint({ cwd });
    const code = [
      "import fs from 'fs';",
      "import something from 'some-random-pkg';",
    ].join("\n");
    const [{ errorCount, messages }] = await eslint.lintText(code, {
      filePath: path.join(cwd, "src", "bad.ts"),
    });
    expect(errorCount).toBeGreaterThan(0);
    expect(messages.some((m) => String(m.ruleId) === "allowed-imports/only-allowed")).toBe(true);
  }, 30000);
});

