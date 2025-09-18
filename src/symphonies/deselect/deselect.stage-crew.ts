import { EventRouter, resolveInteraction, useConductor } from "@renderx-plugins/host-sdk";

function hideOverlayById(id: string) {
  const el = document.getElementById(id) as HTMLDivElement | null;
  if (el) {
    el.style.display = "none";
  }
  return el;
}

export function hideAllOverlays() {
  try {
    const sel = hideOverlayById("rx-selection-overlay");
    const adv = hideOverlayById("rx-adv-line-overlay");
    if (sel) delete (sel as any).dataset?.targetId;
    if (adv) delete (adv as any).dataset?.targetId;
  } catch {}
}

export async function deselectComponent(data: any, ctx: any) {
  try {
    const id = data?.id || ctx?.baton?.id || ctx?.baton?.elementId || ctx?.baton?.selectedId;
    if (!id) return;

    // Only hide overlays that are currently targeting this id
    const sel = document.getElementById("rx-selection-overlay") as HTMLDivElement | null;
    if (sel && sel.dataset?.targetId === String(id)) sel.style.display = "none";
    const adv = document.getElementById("rx-adv-line-overlay") as HTMLDivElement | null;
    if (adv && adv.dataset?.targetId === String(id)) adv.style.display = "none";

    await publishDeselectionChanged({ id }, ctx);
    return { id };
  } catch {}
}

export async function publishDeselectionChanged(data: any, ctx: any) {
  try {
    const baton = ctx?.baton ?? data;
    const id = data?.id || baton?.id || baton?.elementId || baton?.selectedId;
    if (id) await EventRouter.publish("canvas.component.deselection.changed", { id: String(id) }, ctx?.conductor);
  } catch {}
}

export async function publishSelectionsCleared(_data: any, ctx: any) {
  try {
    await EventRouter.publish("canvas.component.selections.cleared", {}, ctx?.conductor);
  } catch {}
}

export async function clearAllSelections(_data: any, ctx: any) {
  try {
    hideAllOverlays();
    await publishSelectionsCleared({}, ctx);
  } catch {}
}

/**
 * Topic-first deselection routing handler
 * - If data.id is present route to canvas.component.deselect sequence
 * - Otherwise route to canvas.component.deselect.all sequence
 */
export async function routeDeselectionRequest(data: any, ctx: any) {
  try {
    const hasId = !!data?.id;
    const conductor = ctx?.conductor || useConductor() || (window as any).RenderX?.conductor;
    if (!conductor?.play) return;

    const key = hasId ? "canvas.component.deselect" : "canvas.component.deselect.all";
    const r = resolveInteraction(key);
    await conductor.play(r.pluginId, r.sequenceId, hasId ? { id: data.id } : {});
  } catch {}
}

// Export handlers for JSON sequence mounting
export const handlers = {
  hideAllOverlays,
  deselectComponent,
  publishDeselectionChanged,
  publishSelectionsCleared,
  clearAllSelections,
  routeDeselectionRequest,
};

