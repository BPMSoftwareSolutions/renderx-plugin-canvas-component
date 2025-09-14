// Stage-crew handler for updating Canvas component attributes from Control Panel changes
import { EventRouter } from "@renderx-plugins/host-sdk";
// TODO: ComponentRuleEngine needs to be added to Host SDK or replaced with SDK equivalent
import { ComponentRuleEngine } from "../../temp-deps/rule-engine";

const ruleEngine = new ComponentRuleEngine();

export function updateAttribute(data: any, ctx: any) {
  const { id, attribute, value } = data || {};

  if (!id || !attribute || value === undefined) {
    ctx.logger?.warn?.(
      "Canvas component update requires id, attribute, and value"
    );
    return;
  }

  const element = document.getElementById(String(id)) as HTMLElement | null;
  if (!element) {
    ctx.logger?.warn?.(`Canvas component with id ${id} not found`);
    return;
  }

  try {
    const applied = ruleEngine.applyUpdate(element, String(attribute), value);
    if (!applied) {
      ctx.logger?.warn?.(`Unknown attribute: ${attribute}`);
      return;
    }

    // Store the updated attribute info for potential use by other handlers
    ctx.payload.updatedAttribute = { id, attribute, value };
    ctx.payload.elementId = id;
  } catch (error) {
    ctx.logger?.warn?.(`Failed to update attribute ${attribute}:`, error);
  }
}

export function refreshControlPanel(data: any, ctx: any) {
  // After updating the Canvas component, refresh the Control Panel to show the changes
  const elementId = ctx.payload?.elementId;

  if (elementId && ctx?.conductor?.play) {
    try {
      // Prefer EventRouter; if unavailable, resolve route and play using resolved IDs
      try {
        EventRouter.publish(
          "control.panel.update.requested",
          {
            id: elementId,
            source: "attribute-update",
          },
          ctx.conductor
        );
      } catch {
        try {
           
          const { resolveInteraction } = require("../../../../src/interactionManifest");
          const route = resolveInteraction("control.panel.update");
          ctx.conductor.play(route.pluginId, route.sequenceId, {
            id: elementId,
            source: "attribute-update",
          });
        } catch {
          // If resolveInteraction is not available in this environment, skip
        }
      }
    } catch (error) {
      ctx.logger?.warn?.(
        "Failed to refresh Control Panel after attribute update:",
        error
      );
    }
  }
}

// Export handlers for JSON sequence mounting
export const handlers = { updateAttribute, refreshControlPanel };
