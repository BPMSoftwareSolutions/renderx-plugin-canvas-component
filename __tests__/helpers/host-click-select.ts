import { resolveInteraction } from "@renderx-plugins/host-sdk";

// Minimal host-like click-to-select bridge for package tests
export function setupHostClickToSelect(getConductor: () => any) {
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
  document.body.addEventListener("click", handler);
  return () => document.body.removeEventListener("click", handler);
}

