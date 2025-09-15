import { ensureOverlay } from "./select.overlay.dom.stage-crew";
import { attachResizeHandlers } from "./select.overlay.resize.stage-crew";
import { applyOverlayRectForEl } from "./select.overlay.dom.stage-crew";
import { useConductor, isFlagEnabled, EventRouter, resolveInteraction } from "@renderx-plugins/host-sdk";
import {
  ensureAdvancedLineOverlayFor,
  attachAdvancedLineManipHandlers,
} from "./select.overlay.line-advanced.stage-crew";

/**
 * Topic-first selection handler: routes canvas.component.select.requested to the selection sequence
 * This ensures data.id is always available from Beat 1 onward, making notify/publish reliable
 */
export async function routeSelectionRequest(data: any, ctx: any) {
  try {
    const id = data?.id;
    if (!id) return;

    // Get conductor with fallback to global conductor
    const conductor = ctx?.conductor || useConductor() || (window as any).RenderX?.conductor;
    if (!conductor?.play) {
      console.warn("No conductor available for selection routing");
      return;
    }

    // Route to the selection sequence with the ID
    const r = resolveInteraction("canvas.component.select");
    await conductor.play(r.pluginId, r.sequenceId, { id });
  } catch (error) {
    // Gracefully handle routing errors
    console.warn("Selection routing error:", error);
  }
}

function deriveSelectedId(data: any): string | undefined {
  return data?.id
    || data?.elementId
    || (data?.event?.target?.closest?.(".rx-comp") as HTMLElement)?.id;
}

function configureHandlesVisibility(ov: HTMLDivElement, targetEl: HTMLElement) {
  const handlesAttr = targetEl.getAttribute("data-resize-handles");
  const allow = new Set(
    (handlesAttr || "nw,n,ne,e,se,s,sw,w")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );
  const handleEls = ov.querySelectorAll<HTMLDivElement>(".rx-handle");
  handleEls.forEach((h) => {
    const dir = Array.from(h.classList).find((c) =>
      ["n", "s", "e", "w", "nw", "ne", "sw", "se"].includes(c)
    );
    (h.style as CSSStyleDeclaration).display =
      dir && allow.has(dir) ? "block" : "none";
  });
}

export function showSelectionOverlay(data: any, ctx?: any) {
  const id = deriveSelectedId(data);
  if (!id) return {};
  const el = document.getElementById(String(id)) as HTMLElement | null;
  if (!el) return {};

  // Standard overlay by default; only switch to endpoint overlay when explicitly requested via data-overlay
  const overlayMode = (el.getAttribute("data-overlay") || "")
    .trim()
    .toLowerCase();
  const wantsEndpointOverlay =
    overlayMode === "line-advanced" || overlayMode === "line-endpoints";
  const isSvgLine =
    el.tagName?.toLowerCase() === "svg" && el.classList.contains("rx-line");
  const isAdvancedLine =
    isFlagEnabled("lineAdvanced") &&
    el.classList.contains("rx-line") &&
    (wantsEndpointOverlay || isSvgLine);

  // Use conductor from context if provided, otherwise get from global context
  const conductor = ctx?.conductor || useConductor();

  if (!isAdvancedLine) {
    const ov = ensureOverlay();
    attachResizeHandlers(ov, conductor);
    ov.dataset.targetId = String(id);
    configureHandlesVisibility(ov, el);
    ov.style.display = "block";
    applyOverlayRectForEl(ov, el);
  } else {
    // Hide the standard rectangular overlay for line components
    const ov = document.getElementById(
      "rx-selection-overlay"
    ) as HTMLDivElement | null;
    if (ov) ov.style.display = "none";
  }

  // Advanced Line overlay (feature-flag gated): endpoint handles only
  try {
    if (isAdvancedLine) {
      const adv = ensureAdvancedLineOverlayFor(el);
      adv.dataset.targetId = String(id);
      attachAdvancedLineManipHandlers(adv, conductor);
      adv.style.display = "block";
    }
  } catch {}

  // Return the ID so it's merged into the baton for subsequent beats
  return { id };
}

export function hideSelectionOverlay() {
  const ov = document.getElementById(
    "rx-selection-overlay"
  ) as HTMLDivElement | null;
  if (ov) ov.style.display = "none";
}

export function notifyUi(data: any, ctx: any) {
  try {
    // Topic-first approach provides data.id, but maintain full backward compatibility
    const overlayId = document.getElementById('rx-selection-overlay')?.dataset?.targetId;
    const id = data?.id || ctx?.baton?.id || ctx?.baton?.elementId || ctx?.baton?.selectedId || overlayId;
    if (!id) return;

    // Direct conductor.play call with fallback
    const play = (ctx?.conductor || useConductor())?.play;
    if (play) {
      play("ControlPanelPlugin", "control-panel-selection-show-symphony", { id });
    }
  } catch {
    // Gracefully handle any errors
  }
}

export async function publishSelectionChanged(data: any, ctx: any) {
  try {
    // Topic-first approach provides data.id, but maintain full backward compatibility
    const baton = ctx?.baton ?? data;
    const overlayId = document.getElementById('rx-selection-overlay')?.dataset?.targetId;
    const id = data?.id || baton?.id || baton?.elementId || baton?.selectedId || overlayId;
    if (id) await EventRouter.publish("canvas.component.selection.changed", { id: String(id) }, ctx?.conductor);
  } catch {}
}

// Export handlers for JSON sequence mounting
export const handlers = { routeSelectionRequest, showSelectionOverlay, hideSelectionOverlay, notifyUi, publishSelectionChanged };
