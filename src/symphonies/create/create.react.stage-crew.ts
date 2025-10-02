import React from "react";
import { createRoot } from "react-dom/client";

// Track React roots for cleanup
const reactRoots = new Map<string, any>();

/**
 * Renders React code inside a canvas component node.
 * Compiles user-provided React code and mounts it using React 19 createRoot.
 */
export const renderReact = (data: any, ctx: any) => {
  // Only process React components
  if (ctx.payload.kind !== "react") {
    return;
  }

  const nodeId = ctx.payload.nodeId;
  const template = ctx.payload.template;
  const reactCode = template.react?.code;

  if (!nodeId || !reactCode) {
    ctx.logger?.warn?.("renderReact: Missing nodeId or React code");
    return;
  }

  try {
    // Get the DOM container that was created by createNode
    const container = document.getElementById(nodeId);
    if (!container) {
      throw new Error(`Container element not found: ${nodeId}`);
    }

    // Clean up any existing React root for this node
    const existingRoot = reactRoots.get(nodeId);
    if (existingRoot) {
      existingRoot.unmount();
      reactRoots.delete(nodeId);
    }

    // Compile the React code using new Function
    // Support both default export and explicit function export patterns
    const compiledComponent = compileReactCode(reactCode);

    // Create React root and render the component
    const root = createRoot(container);
    const element = React.createElement(compiledComponent);
    root.render(element);

    // Track the root for future cleanup
    reactRoots.set(nodeId, root);

    // Update payload to indicate successful React rendering
    ctx.payload.reactRendered = true;

  } catch (error) {
    // Handle compilation or rendering errors gracefully
    const errorMessage = error instanceof Error ? error.message : String(error);
    ctx.logger?.error?.("renderReact error:", errorMessage);
    
    // Display user-friendly error in the container
    const container = document.getElementById(nodeId);
    if (container) {
      container.innerHTML = `
        <div style="
          padding: 8px; 
          background: #fee; 
          border: 1px solid #fcc; 
          border-radius: 4px; 
          color: #c33;
          font-family: monospace;
          font-size: 12px;
        ">
          <strong>React Error:</strong><br>
          ${escapeHtml(errorMessage)}
        </div>
      `;
    }
    
    ctx.payload.reactError = errorMessage;
  }
};

/**
 * Compiles React code string into a React component function.
 * Supports both default export and explicit function export patterns.
 */
function compileReactCode(code: string): React.ComponentType {
  // Create a safe execution context with React in scope
  const functionBody = `
    "use strict";
    ${code}
    
    // Handle different export patterns
    if (typeof exports !== 'undefined' && exports.default) {
      return exports.default;
    }
    
    // Look for default export function
    const defaultMatch = code.match(/export\\s+default\\s+function\\s+(\\w+)/);
    if (defaultMatch) {
      return eval(defaultMatch[1]);
    }
    
    // Look for arrow function default export
    const arrowMatch = code.match(/export\\s+default\\s+\\(([^)]*)\\)\\s*=>/);
    if (arrowMatch) {
      return eval('(' + code.substring(code.indexOf('(')) + ')');
    }
    
    // Look for any function declaration and use it
    const funcMatch = code.match(/function\\s+(\\w+)/);
    if (funcMatch) {
      return eval(funcMatch[1]);
    }
    
    // Fallback: wrap the entire code as a component
    return function GeneratedComponent() {
      return React.createElement('div', { 
        style: { padding: '8px', color: '#666' } 
      }, 'Component could not be parsed');
    };
  `;

  try {
    // Create function with React in scope
    const compiledFunction = new Function('React', 'exports', functionBody);
    const exports = {};
    const component = compiledFunction(React, exports);
    
    // Validate that we got a valid React component
    if (typeof component !== 'function') {
      throw new Error('Compiled code did not return a valid React component function');
    }
    
    return component;
  } catch (error) {
    // Return error component if compilation fails
    return function ErrorComponent() {
      return React.createElement('div', {
        style: {
          padding: '8px',
          background: '#fee',
          border: '1px solid #fcc',
          borderRadius: '4px',
          color: '#c33',
          fontFamily: 'monospace',
          fontSize: '12px'
        }
      }, `Compilation Error: ${error instanceof Error ? error.message : String(error)}`);
    };
  }
}

/**
 * Cleanup function to unmount React roots when components are deleted
 */
export function cleanupReactRoot(nodeId: string) {
  const root = reactRoots.get(nodeId);
  if (root) {
    root.unmount();
    reactRoots.delete(nodeId);
  }
}

/**
 * Escape HTML to prevent XSS in error messages
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
