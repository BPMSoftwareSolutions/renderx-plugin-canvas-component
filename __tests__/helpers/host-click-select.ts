import { resolveInteraction, EventRouter } from "@renderx-plugins/host-sdk";

// Minimal host-like click-to-select bridge for package tests
export function setupHostClickToSelect(getConductor: () => any) {
  const handler = async (e: any) => {
    let target = e?.target as HTMLElement | null;
    while (target && !target.id) target = target.parentElement;
    const id = target?.id;
    if (!id) return;
    try {
      const conductor = getConductor?.();

      // Topic-first approach: publish canvas.component.select.requested
      // This will be routed to the selection sequence with guaranteed ID
      // Ensure conductor is passed explicitly for proper routing
      await EventRouter.publish("canvas.component.select.requested", { id }, conductor);

      // Fallback to direct sequence play (for backward compatibility)
      // In practice, hosts should prefer the topic-first approach
      if (!EventRouter.publish) {
        const r = resolveInteraction("canvas.component.select");
        conductor?.play?.(r.pluginId, r.sequenceId, { id });
      }
    } catch (error) {
      console.warn("Selection click handler error:", error);
    }
  };
  document.body.addEventListener("click", handler, true);
  return () => document.body.removeEventListener("click", handler, true);
}

// Production-ready host implementation example
export function setupProductionHostClickToSelect() {
  const handler = async (e: any) => {
    let target = e?.target as HTMLElement | null;
    while (target && !target.id) target = target.parentElement;
    const id = target?.id;
    if (!id) return;

    try {
      // Get conductor from global RenderX system
      const conductor = (window as any).RenderX?.conductor
        || (window as any).renderxCommunicationSystem?.conductor;

      if (!conductor) {
        console.warn("No conductor available for selection");
        return;
      }

      // Topic-first approach with explicit conductor
      await EventRouter.publish("canvas.component.select.requested", { id }, conductor);

    } catch (error) {
      console.warn("Production selection handler error:", error);

      // Ultimate fallback: direct sequence play via manifest
      try {
        const manifest = await (await fetch("/topics-manifest.json")).json();
        const route = manifest.topics?.["canvas.component.select.requested"]?.routes?.[0];
        if (route) {
          const conductor = (window as any).renderxCommunicationSystem?.conductor;
          await conductor?.play?.(route.pluginId, route.sequenceId, { id });
        }
      } catch (fallbackError) {
        console.error("All selection fallbacks failed:", fallbackError);
      }
    }
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

