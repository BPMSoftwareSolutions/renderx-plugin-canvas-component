import { EventRouter, resolveInteraction } from "@renderx-plugins/host-sdk";
import { getClipboardText } from "../_clipboard";

function _getSelectedId(data: any): string | undefined {
  const overlayId = (document.getElementById("rx-selection-overlay") as HTMLDivElement | null)?.dataset?.targetId;
  return data?.id || data?.selectedId || overlayId;
}

function _serializeElementFallback(el: HTMLElement, id: string) {
  const tag = el.tagName.toLowerCase();
  const classes = Array.from(el.classList || []).filter((c) => !/^rx-comp-[^-]+-/.test(c));
  const style: Record<string, string> = {};
  if (el.style.width) style.width = el.style.width;
  if (el.style.height) style.height = el.style.height;
  if (el.style.background) style.background = el.style.background;
  if (el.style.color) style.color = el.style.color;
  if (el.style.padding) style.padding = el.style.padding;
  const x = el.style.left ? parseFloat(el.style.left) : 0;
  const y = el.style.top ? parseFloat(el.style.top) : 0;
  const template: any = { tag, classes, style, text: (el.textContent || "").toString() };
  if (el.getAttribute("data-role") === "container") {
    template.attributes = { ...(template.attributes || {}), "data-role": "container" };
  }
  return { id, template, position: { x, y } };
}


export async function readFromClipboard(_data: any, _ctx: any) {
  let text = "";
  try {
    text = await (navigator as any)?.clipboard?.readText?.();
  } catch (err) {
    // ignore
  }
  // Fallback to in-memory clipboard when system clipboard is empty/unavailable
  if (!text) {
    try { text = getClipboardText(); } catch {}
  }
  try {
    const obj = JSON.parse(String(text || ""));
    if (obj && obj.type === "renderx-component") {
      return { clipboardText: text, clipboardData: obj };
    }
  } catch {}
  return { clipboardText: text };
}

export async function deserializeComponentData(data: any, _ctx: any) {
  let raw = String(data?.clipboardText || "");
  if (!raw) {
    try { raw = getClipboardText(); } catch {}
  }
  try {
    const obj = JSON.parse(raw);
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
    let comp = data?.clipboardData?.component;
    // Fallback parse from memory clipboard if component missing
    if (!comp) {
      // Try memory clipboard JSON
      try {
        const raw = getClipboardText();
        const obj = JSON.parse(String(raw || ""));
        if (obj && obj.type === "renderx-component") comp = obj.component;
      } catch {}
      // As a last resort, if a selection exists, reconstruct a minimal component from DOM
      if (!comp) {
        try {
          const id = _getSelectedId(data);
          const el = id ? (document.getElementById(String(id)) as HTMLElement | null) : null;
          if (el) comp = _serializeElementFallback(el, String(id));
        } catch {}
      }
    }
    const template = comp?.template;
    const base = comp?.position || { x: 0, y: 0 };
    let position = data?.newPosition ?? { x: (base.x || 0) + 20, y: (base.y || 0) + 20 };
    // Defensive: if somehow position equals original, bump by +20/+20
    if (comp?.position && position.x === comp.position.x && position.y === comp.position.y) {
      position = { x: position.x + 20, y: position.y + 20 };
    }
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

