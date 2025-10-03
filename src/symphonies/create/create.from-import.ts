import { EventRouter, resolveInteraction } from "@renderx-plugins/host-sdk";

// Transform a single import component record into a canvas.component.create payload
export function transformImportToCreatePayload(importComponent: any) {
  const template: any = {
    tag: importComponent.tag,
    classes: importComponent.classRefs || [],
    style: importComponent.style || {},
    text: importComponent.content?.text || importComponent.content?.content,
    cssVariables: importComponent.cssVariables || {},
    css: importComponent.css,
  };

  // Set container role if this is a container component
  if (Array.isArray(importComponent.classRefs) && importComponent.classRefs.includes("rx-container")) {
    template.attributes = { "data-role": "container" };
  }

  // Include content if present
  if (importComponent.content && Object.keys(importComponent.content).length > 0) {
    template.content = importComponent.content;
  }

  // Add dimensions to template if available
  if (importComponent.layout?.width && importComponent.layout?.height) {
    template.dimensions = {
      width: importComponent.layout.width,
      height: importComponent.layout.height,
    };
  }

  const payload: any = {
    component: { template },
    position: {
      x: importComponent.layout?.x || 0,
      y: importComponent.layout?.y || 0,
    },
    containerId: importComponent.parentId || undefined,
    _overrideNodeId: importComponent.id,
  };

  return payload;
}

// Optional wiring helpers used during import to match library drop behavior
export function attachStandardImportInteractions(payload: any, ctx: any) {
  payload.onDragStart = (info: any) => {
    try { (globalThis as any).__cpDragInProgress = true; } catch {}
    try { EventRouter.publish("canvas.component.drag.start", { id: info?.id }, ctx.conductor); } catch {}
  };
  payload.onDragMove = (info: any) => {
    try {
      const { id, position } = info || {};
      EventRouter.publish("canvas.component.drag.move", { id, position }, ctx.conductor);
    } catch {}
  };
  payload.onDragEnd = (info: any) => {
    try { (globalThis as any).__cpDragInProgress = false; } catch {}
    try {
      const { id, finalPosition, correlationId } = info || {};
      const position = finalPosition || info?.position;
      EventRouter.publish("canvas.component.drag.end", { id, position, correlationId }, ctx.conductor);
    } catch {}
  };
  payload.onSelected = (info: any) => {
    try { EventRouter.publish("canvas.component.selection.changed", { id: info?.id }, ctx.conductor); } catch {}
  };
}

// Convenience runner to create a component from an import record via the standard create route
export async function createFromImportRecord(importComponent: any, ctx: any) {
  const r = resolveInteraction("canvas.component.create");
  const payload = transformImportToCreatePayload(importComponent);
  attachStandardImportInteractions(payload, ctx);
  await ctx.conductor?.play?.(r.pluginId, r.sequenceId, payload);
  return payload;
}



// Transform a clipboard-shaped component (from copy/DOM serialize) to create payload
export function transformClipboardToCreatePayload(clipComponent: any) {
  // Handle nested clipboard structure: {type, version, component: {template, position}}
  let actualComponent = clipComponent;
  if (clipComponent?.type === "renderx-component" && clipComponent?.component) {
    actualComponent = clipComponent.component;
  }

  const template = actualComponent?.template || {};
  const position = actualComponent?.position || { x: 0, y: 0 };
  const payload: any = { component: { template }, position };
  // Note: Do NOT preserve original ID on paste
  return payload;
}

// Generic: choose appropriate transform for import or clipboard shapes
export function toCreatePayloadFromData(input: any) {
  // Import record shape has tag/classRefs/layout
  if (input && (input.tag || input.classRefs || input.layout)) {
    return transformImportToCreatePayload(input);
  }
  // Clipboard record has template/position OR renderx-component wrapper
  if (input && (input.template || input.position || input.type === "renderx-component")) {
    return transformClipboardToCreatePayload(input);
  }
  // Fallback to empty template
  return { component: { template: {} }, position: { x: 0, y: 0 } };
}
