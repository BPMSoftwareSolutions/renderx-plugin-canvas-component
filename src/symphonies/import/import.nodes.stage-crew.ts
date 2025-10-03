import { resolveInteraction, EventRouter } from "@renderx-plugins/host-sdk";
import { transformImportToCreatePayload, attachStandardImportInteractions } from "../create/create.from-import";



/**
 * NEW: Sequential component creation handler that uses canvas.component.create
 * as the single source of truth for all component creation
 */
export async function createComponentsSequentially(_data: any, ctx: any) {
  const components: any[] = ctx.payload.importComponents || [];
  const r = resolveInteraction("canvas.component.create");

  // Track created components for hierarchy application
  ctx.payload.createdComponents = [];

  for (const comp of components) {
    // Transform import data to canvas.component.create format via shared helper
    const createPayload = transformImportToCreatePayload(comp);

    // Attach standard interactions for import-created components
    attachStandardImportInteractions(createPayload, ctx);

    // Call canvas.component.create for each component
    await ctx.conductor?.play?.(r.pluginId, r.sequenceId, createPayload);

    ctx.payload.createdComponents.push({
      id: comp.id,
      parentId: comp.parentId,
      siblingIndex: comp.siblingIndex,
    });
  }
}

export function applyHierarchyAndOrder(_data: any, ctx: any) {
  const list: any[] = ctx.payload.importComponents || [];
  const byParent = new Map<string | null, any[]>();

  for (const c of list) {
    const p = c.parentId ?? null;
    if (!byParent.has(p)) byParent.set(p, []);
    byParent.get(p)!.push(c);
  }

  // Sort each sibling group by siblingIndex
  for (const [parentId, group] of byParent) {
    group.sort((a, b) => (a.siblingIndex || 0) - (b.siblingIndex || 0));
    const parentEl = parentId
      ? (document.getElementById(parentId) as HTMLElement | null)
      : null;
    const container = parentEl || document.getElementById("rx-canvas");
    if (!container) continue;
    for (const child of group) {
      const el = document.getElementById(child.id) as HTMLElement | null;
      if (!el) continue;
      container.appendChild(el); // appending in order enforces sibling order
    }
  }

  // Notify import completed
  try {
    const correlationId = ctx.payload.importCorrelationId;
    const components = Array.isArray(list) ? list.length : 0;
    if (correlationId) {
      EventRouter.publish(
        "canvas.component.import.completed",
        { correlationId, components },
        ctx.conductor
      );
    }
  } catch {}
}
