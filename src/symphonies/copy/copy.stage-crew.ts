import { EventRouter } from "@renderx-plugins/host-sdk";

function getSelectedId(data: any): string | undefined {
  const overlayId = (document.getElementById("rx-selection-overlay") as HTMLDivElement | null)?.dataset?.targetId;
  return data?.id || data?.selectedId || overlayId;
}

function serializeElement(el: HTMLElement, id: string) {
  const tag = el.tagName.toLowerCase();
  const classes = Array.from(el.classList || []).filter((c) => !/^rx-comp-[^-]+-/.test(c));
  const attributes: Record<string, string> = {};
  for (const attr of Array.from(el.attributes || [])) {
    const name = attr.name;
    if (name === "id" || name === "class" || name === "style") continue;
    attributes[name] = attr.value;
  }
  const style: Record<string, string> = {};
  // Capture inline width/height if present
  if (el.style.width) style.width = el.style.width;
  if (el.style.height) style.height = el.style.height;
  if (el.style.background) style.background = el.style.background;
  if (el.style.color) style.color = el.style.color;
  if (el.style.padding) style.padding = el.style.padding;
  // Position
  const x = el.style.left ? parseFloat(el.style.left) : 0;
  const y = el.style.top ? parseFloat(el.style.top) : 0;

  const template: any = {
    tag,
    classes: classes,
    style,
    text: (el.textContent || "").toString(),
  };
  // Preserve container role if applicable
  if (el.getAttribute("data-role") === "container") {
    template.attributes = { ...(template.attributes || {}), "data-role": "container" };
  }

  return {
    id,
    template,
    position: { x, y },
    classes,
    attributes,
    style,
  };
}

export async function serializeSelectedComponent(data: any, ctx: any) {
  const id = getSelectedId(data);
  if (!id) return {};
  const el = document.getElementById(String(id)) as HTMLElement | null;
  if (!el) return {};
  const component = serializeElement(el, String(id));
  const payload = {
    type: "renderx-component",
    version: "1.0",
    component,
    metadata: { copiedAt: new Date().toISOString() },
  };
  return { clipboardData: payload };
}

export async function copyToClipboard(data: any, ctx: any) {
  try {
    const blob = data?.clipboardData || data;
    const text = JSON.stringify(blob);
    await (navigator as any)?.clipboard?.writeText?.(text);
  } catch (err) {
    try { ctx?.logger?.warn?.("Clipboard write failed", err); } catch {}
  }
}

export async function notifyCopyComplete(_data: any, ctx: any) {
  try {
    await EventRouter.publish("canvas.component.copied", {}, ctx?.conductor);
  } catch {}
}

export const handlers = { serializeSelectedComponent, copyToClipboard, notifyCopyComplete };

