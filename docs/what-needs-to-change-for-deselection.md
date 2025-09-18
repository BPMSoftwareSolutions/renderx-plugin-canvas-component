## Summary
Deselection is topic-first. Your new sequences listen for a deselection “request” and then either deselect a single id or clear all. To make “clicking the blank canvas clears selection” work, the Host should publish the deselection request when the canvas background is clicked. The Canvas plugin should ensure background clicks reach the canvas (overlays don’t eat clicks) and may optionally provide a built-in fallback publisher.

Below are targeted instructions for each repo/team.

---

## Host: renderx-plugins-demo (what to change)

1) Ensure dependencies/sequences are registered
- Update to the canvas-component version that contains deselection (the one from PR feat(#8)).
- If your app auto-registers plugin sequences from each package’s index.json, no code change is needed. Otherwise, make sure the canvas-component sequences (including deselect.requested.json) are registered just like select.requested.json is.

2) Publish the deselection request on blank-canvas clicks
- Add a click listener on the canvas container (#rx-canvas), and when the click target is not inside a component (e.g., not within an element with class rx-comp or id rx-node-…), publish the topic canvas.component.deselect.requested with no id. That will route to deselect-all and clear overlays.

Example wiring (Host-side):
````ts mode=EXCERPT
import { EventRouter } from "@renderx-plugins/host-sdk";

function wireCanvasDeselect(canvas: HTMLElement, conductor: any) {
  canvas.addEventListener("click", async (e: Event) => {
    const target = e.target as HTMLElement;
    const isComp = target.closest?.(".rx-comp,[id^='rx-node-']");
    if (!isComp) await EventRouter.publish("canvas.component.deselect.requested", {}, conductor);
  }, true);
}
````

3) Optional: also clear selection on Escape
- Many users expect ESC to clear selection; publish the same topic on keydown Escape.

````ts mode=EXCERPT
window.addEventListener("keydown", async (e) => {
  if (e.key === "Escape") await EventRouter.publish("canvas.component.deselect.requested", {}, conductor);
});
````

4) Keep click-to-select as-is
- Your existing click-to-select should continue publishing canvas.component.select.requested with an id. The deselect handler only fires when there’s no component under the cursor.

Acceptance check (Host):
- Clicking a component still selects it.
- Clicking empty canvas clears overlays and publishes canvas.component.selections.cleared (observable in logs/subscribers).
- Pressing ESC clears selection (if you implement step 3).

---

## Canvas: renderx-plugin-canvas (what to change)

The Canvas plugin can remain minimal and rely on the Host to publish deselection, but there are two recommended actions to ensure background clicks work reliably:

1) Ensure overlays don’t block clicks to the canvas
- The selection overlays should not consume pointer events; verify pointer-events: none for their containers so a click “through” overlays still reaches #rx-canvas.

````css mode=EXCERPT
#rx-selection-overlay,
#rx-adv-line-overlay {
  pointer-events: none; /* allow click-through for background deselect */
}
````

2) Verify stable DOM IDs
- Keep using:
  - Canvas root: #rx-canvas
  - Overlays: #rx-selection-overlay and #rx-adv-line-overlay
- The deselection handlers in canvas-component hide these by ID.

Optional fallback (Canvas plugin):
- If you want a default behavior without depending on the Host, the Canvas plugin can publish deselection on background clicks on #rx-canvas. This is safe and won’t conflict with the Host; the topic just routes:

````ts mode=EXCERPT
import { EventRouter } from "@renderx-plugins/host-sdk";

export function attachCanvasBackgroundDeselect(canvas: HTMLElement, conductor: any) {
  canvas.addEventListener("click", async (e: Event) => {
    const target = e.target as HTMLElement;
    const isComp = target.closest?.(".rx-comp,[id^='rx-node-']");
    if (!isComp) await EventRouter.publish("canvas.component.deselect.requested", {}, conductor);
  }, true);
}
````

Acceptance check (Canvas):
- Overlays allow click-through; background clicks reach the canvas element.
- No overlay element prevents propagation to the canvas background listener.

---

## How it flows end-to-end
- Host publishes canvas.component.deselect.requested (no id) on a background click
- canvas-component’s deselect.requested.json calls routeDeselectionRequest, which routes to “deselect-all”
- The handlers hide #rx-selection-overlay and #rx-adv-line-overlay and publish:
  - canvas.component.selections.cleared

This mirrors the topic-first selection approach already in use, keeping responsibilities clean:
- Host = interprets user intent (what was clicked)
- Canvas plugin = presents the canvas DOM and ensures clicks can reach it
- Canvas Component plugin = implements the selection/deselection orchestration and overlay lifecycle
