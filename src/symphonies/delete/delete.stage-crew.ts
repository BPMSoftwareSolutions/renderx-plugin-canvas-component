import { EventRouter, resolveInteraction, useConductor } from "@renderx-plugins/host-sdk";

function resolveId(data: any, ctx: any): string | undefined {
  const fromData = data?.id;
  const fromBaton = ctx?.baton?.id || ctx?.baton?.elementId || ctx?.baton?.selectedId;
  if (fromData) return String(fromData);
  if (fromBaton) return String(fromBaton);
  // Fallback: current selection overlay target
  const sel = document.getElementById("rx-selection-overlay") as HTMLDivElement | null;
  const overlayId = sel?.dataset?.targetId;
  return overlayId ? String(overlayId) : undefined;
}

export async function publishDeleted(data: any, ctx: any) {
  try {
    const id = resolveId(data, ctx);
    if (!id) return;
    await EventRouter.publish("canvas.component.deleted", { id }, ctx?.conductor);
  } catch {}
}

function hideOverlaysForId(id: string) {
  try {
    const sel = document.getElementById("rx-selection-overlay") as HTMLDivElement | null;
    if (sel && sel.dataset?.targetId === String(id)) sel.style.display = "none";
    const adv = document.getElementById("rx-adv-line-overlay") as HTMLDivElement | null;
    if (adv && adv.dataset?.targetId === String(id)) adv.style.display = "none";
  } catch {}
}

export async function deleteComponent(data: any, ctx: any) {
  try {
    const id = resolveId(data, ctx);
    if (!id) return;

    const el = document.getElementById(String(id));
    if (el && el.parentElement) {
      el.parentElement.removeChild(el);
    }

    hideOverlaysForId(String(id));
    await publishDeleted({ id }, ctx);
    return { id };
  } catch {}
}

export async function routeDeleteRequest(data: any, ctx: any) {
  try {
    const id = resolveId(data, ctx);
    if (!id) return;

    const conductor = ctx?.conductor || useConductor() || (window as any)?.RenderX?.conductor;
    if (!conductor?.play) return;

    const r = resolveInteraction("canvas.component.delete");
    if (!r?.pluginId || !r?.sequenceId) return;

    await conductor.play(r.pluginId, r.sequenceId, { id });
  } catch {}
}

export const handlers = { deleteComponent, publishDeleted, routeDeleteRequest };

