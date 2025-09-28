/* @vitest-environment jsdom */
import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock React and ReactDOM before importing the module
vi.mock("react", () => ({
  default: {
    createElement: vi.fn((type, props, ...children) => ({ type, props, children })),
  },
}));

vi.mock("react-dom/client", () => ({
  createRoot: vi.fn(() => ({
    render: vi.fn(),
    unmount: vi.fn(),
  })),
}));

import { renderReact, cleanupReactRoot } from "../src/symphonies/create/create.react.stage-crew";
import React from "react";
import { createRoot } from "react-dom/client";

// Get the mocked functions
const mockCreateRoot = vi.mocked(createRoot);
const mockRender = vi.fn();
const mockUnmount = vi.fn();

function makeReactTemplate(code: string) {
  return {
    render: { strategy: "react" },
    react: { code },
    tag: "div",
    classes: ["rx-comp", "rx-react"],
    style: { width: 240, height: 120 },
  };
}

function makeCtx(kind = "react", nodeId = "rx-node-test123") {
  return {
    payload: {
      kind,
      nodeId,
      template: {},
    },
    logger: {
      warn: vi.fn(),
      error: vi.fn(),
    },
  };
}

describe("renderReact handler", () => {
  beforeEach(() => {
    // Set up DOM environment
    document.body.innerHTML = '<div id="rx-canvas"></div>';

    // Reset mocks and set up fresh mock implementations
    vi.clearAllMocks();
    mockCreateRoot.mockReturnValue({
      render: mockRender,
      unmount: mockUnmount,
    });
  });

  it("skips rendering for non-React components", () => {
    const ctx = makeCtx("regular");
    const template = makeReactTemplate("export default function Hello() { return <div>Hello</div>; }");
    ctx.payload.template = template;

    renderReact({}, ctx);

    expect(mockCreateRoot).not.toHaveBeenCalled();
    expect(mockRender).not.toHaveBeenCalled();
  });

  it("warns and returns early if nodeId is missing", () => {
    const ctx = makeCtx("react", "");
    const template = makeReactTemplate("export default function Hello() { return <div>Hello</div>; }");
    ctx.payload.template = template;

    renderReact({}, ctx);

    expect(ctx.logger.warn).toHaveBeenCalledWith("renderReact: Missing nodeId or React code");
    expect(mockCreateRoot).not.toHaveBeenCalled();
  });

  it("warns and returns early if React code is missing", () => {
    const ctx = makeCtx();
    const template = makeReactTemplate("");
    ctx.payload.template = template;

    renderReact({}, ctx);

    expect(ctx.logger.warn).toHaveBeenCalledWith("renderReact: Missing nodeId or React code");
    expect(mockCreateRoot).not.toHaveBeenCalled();
  });

  it("renders a simple React component with default export", () => {
    // Create container element
    const container = document.createElement("div");
    container.id = "rx-node-test123";
    document.body.appendChild(container);

    const ctx = makeCtx();
    const template = makeReactTemplate("export default function Hello() { return <div>Hello React</div>; }");
    ctx.payload.template = template;

    renderReact({}, ctx);

    expect(mockCreateRoot).toHaveBeenCalledWith(container);
    expect(mockRender).toHaveBeenCalled();
    expect(ctx.payload.reactRendered).toBe(true);
  });

  it("handles compilation errors gracefully", () => {
    // Create container element
    const container = document.createElement("div");
    container.id = "rx-node-test123";
    document.body.appendChild(container);

    // Mock createRoot to throw an error
    mockCreateRoot.mockImplementation(() => {
      throw new Error("React createRoot failed");
    });

    const ctx = makeCtx();
    const template = makeReactTemplate("export default function Hello() { return <div>Hello</div>; }");
    ctx.payload.template = template;

    renderReact({}, ctx);

    expect(ctx.logger.error).toHaveBeenCalled();
    expect(ctx.payload.reactError).toBeDefined();
    expect(container.innerHTML).toContain("React Error:");
  });

  it("handles missing container element", () => {
    const ctx = makeCtx("react", "nonexistent-id");
    const template = makeReactTemplate("export default function Hello() { return <div>Hello</div>; }");
    ctx.payload.template = template;

    renderReact({}, ctx);

    expect(ctx.logger.error).toHaveBeenCalled();
    expect(ctx.payload.reactError).toContain("Container element not found");
  });

  it("cleans up existing React root before creating new one", () => {
    // Create container element
    const container = document.createElement("div");
    container.id = "rx-node-test123";
    document.body.appendChild(container);

    const ctx = makeCtx();
    const template = makeReactTemplate("export default function Hello() { return <div>Hello</div>; }");
    ctx.payload.template = template;

    // First render
    renderReact({}, ctx);
    expect(mockCreateRoot).toHaveBeenCalledTimes(1);
    expect(mockRender).toHaveBeenCalledTimes(1);

    // Reset the mock call counts to isolate the second call
    vi.clearAllMocks();
    mockCreateRoot.mockReturnValue({
      render: mockRender,
      unmount: mockUnmount,
    });

    // Second render should cleanup first
    renderReact({}, ctx);
    expect(mockUnmount).toHaveBeenCalledTimes(1);
    expect(mockCreateRoot).toHaveBeenCalledTimes(1);
    expect(mockRender).toHaveBeenCalledTimes(1);
  });

  it("handles arrow function components", () => {
    // Create container element
    const container = document.createElement("div");
    container.id = "rx-node-test123";
    document.body.appendChild(container);

    const ctx = makeCtx();
    const template = makeReactTemplate("export default () => <div>Arrow Function Component</div>");
    ctx.payload.template = template;

    renderReact({}, ctx);

    expect(mockCreateRoot).toHaveBeenCalledWith(container);
    expect(mockRender).toHaveBeenCalled();
    expect(ctx.payload.reactRendered).toBe(true);
  });

  it("handles function declarations without export", () => {
    // Create container element
    const container = document.createElement("div");
    container.id = "rx-node-test123";
    document.body.appendChild(container);

    const ctx = makeCtx();
    const template = makeReactTemplate("function MyComponent() { return <div>Function Declaration</div>; }");
    ctx.payload.template = template;

    renderReact({}, ctx);

    expect(mockCreateRoot).toHaveBeenCalledWith(container);
    expect(mockRender).toHaveBeenCalled();
    expect(ctx.payload.reactRendered).toBe(true);
  });
});

describe("cleanupReactRoot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("cleans up React root when it exists", () => {
    // Simulate a React root being tracked
    const container = document.createElement("div");
    container.id = "rx-node-test123";
    document.body.appendChild(container);

    const ctx = makeCtx();
    const template = makeReactTemplate("export default function Hello() { return <div>Hello</div>; }");
    ctx.payload.template = template;

    // Create a root first
    renderReact({}, ctx);
    expect(mockCreateRoot).toHaveBeenCalled();

    // Now clean it up
    cleanupReactRoot("rx-node-test123");
    expect(mockUnmount).toHaveBeenCalled();
  });

  it("handles cleanup for non-existent roots gracefully", () => {
    cleanupReactRoot("nonexistent-id");
    // Should not throw or cause issues
    expect(mockUnmount).not.toHaveBeenCalled();
  });
});
