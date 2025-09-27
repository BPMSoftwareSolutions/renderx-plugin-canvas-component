import { EventRouter, resolveInteraction } from "@renderx-plugins/host-sdk";

export async function readFromClipboard(_data: any, _ctx: any) {
  let text = "";
  try {
    text = await (navigator as any)?.clipboard?.readText?.();
  } catch (err) {
    // ignore
  }
  return { clipboardText: text };
}

export async function deserializeComponentData(data: any, _ctx: any) {
  try {
    const obj = JSON.parse(String(data?.clipboardText || ""));
    if (obj && obj.type === "renderx-component") {
      return { clipboardData: obj };
    }
  } catch {}
  return {};
}

export async function calculatePastePosition(data: any, _ctx: any) {
  const comp = data?.clipboardData?.component;
  if (!comp) return data || {};
  const pos = comp.position || { x: 0, y: 0 };
  const newPosition = { x: (pos.x || 0) + 20, y: (pos.y || 0) + 20 };
  return { ...data, newPosition };
}

export async function createPastedComponent(data: any, ctx: any) {
  try {
    const comp = data?.clipboardData?.component;
    const template = comp?.template;
    const position = data?.newPosition || comp?.position || { x: 0, y: 0 };
    if (!template) return;
    const payload = { component: { template }, position };
    const r = resolveInteraction("canvas.component.create");
    await ctx?.conductor?.play?.(r.pluginId, r.sequenceId, payload);
  } catch (err) {
    try { ctx?.logger?.warn?.("Create pasted component failed", err); } catch {}
  }
}

export async function notifyPasteComplete(_data: any, ctx: any) {
  try {
    await EventRouter.publish("canvas.component.pasted", {}, ctx?.conductor);
  } catch {}
}

export const handlers = { readFromClipboard, deserializeComponentData, calculatePastePosition, createPastedComponent, notifyPasteComplete };

