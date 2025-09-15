import { resolveInteraction, EventRouter } from "@renderx-plugins/host-sdk";

// Minimal host-like click-to-select bridge for package tests
export function setupHostClickToSelect(getConductor: () => any) {
  const handler = (e: any) => {
    let target = e?.target as HTMLElement | null;
    while (target && !target.id) target = target.parentElement;
    const id = target?.id;
    if (!id) return;
    try {
      const conductor = getConductor?.();

      // Topic-first approach: publish canvas.component.select.requested
      // This will be routed to the selection sequence with guaranteed ID
      EventRouter.publish("canvas.component.select.requested", { id }, conductor);

      // Fallback to direct sequence play (for backward compatibility)
      // In practice, hosts should prefer the topic-first approach
      if (!EventRouter.publish) {
        const r = resolveInteraction("canvas.component.select");
        conductor?.play?.(r.pluginId, r.sequenceId, { id });
      }
    } catch {}
  };
  document.body.addEventListener("click", handler, true);
  return () => document.body.removeEventListener("click", handler, true);
}

// Legacy direct-play approach (for comparison)
export function setupHostClickToSelectLegacy(getConductor: () => any) {
  const handler = (e: any) => {
    let target = e?.target as HTMLElement | null;
    while (target && !target.id) target = target.parentElement;
    const id = target?.id;
    if (!id) return;
    try {
      const r = resolveInteraction("canvas.component.select");
      const conductor = getConductor?.();
      conductor?.play?.(r.pluginId, r.sequenceId, { id });
    } catch {}
  };
  document.body.addEventListener("click", handler, true);
  return () => document.body.removeEventListener("click", handler, true);
}

