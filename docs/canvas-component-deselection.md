## Implementation Plan: Canvas Component Deselection

### Current Architecture Analysis ✅
The plugin currently has a robust selection system with:
- Topic-first selection routing via `routeSelectionRequest`
- Overlay management with `showSelectionOverlay` and `hideSelectionOverlay`
- Event publishing for selection changes
- JSON-based sequences for orchestration
- Comprehensive test coverage for selection scenarios

### Phase 1: Core Deselection Handlers

**1. Create Deselect Stage-Crew Handlers**
- `deselectComponent(data, ctx)`
  - Hide overlays for the specified component ID. If the active overlay(s) target the given ID, hide them.
  - Publish `canvas.component.deselection.changed` with `{ id }`.
- `clearAllSelections(_data, ctx)`
  - Call `hideAllOverlays()`.
  - Publish `canvas.component.selections.cleared`.
- `hideAllOverlays()`
  - Hide both selection overlays: `#rx-selection-overlay` (standard) and `#rx-adv-line-overlay` (advanced line endpoints).
  - Clear any `dataset.targetId` stored on these overlays to avoid stale state.

> Note: We do not maintain a separate selection store in this package; selection model clearing is delegated to subscribers (e.g., Control Panel) via topics.

**2. Create Deselection JSON Sequences**
- `deselect.json` – Single component deselection sequence
  - Beats: hide overlays for ID → publish deselection topic
- `deselect-all.json` – Clear all selections sequence
  - Beats: hide all overlays → publish selections cleared topic
- Keep handlers kind/purity consistent with selection symphony (hide = stage-crew, publish = pure)

### Phase 2: Event Integration

**3. Add Deselection Event Routing (Topic-first)**
- `routeDeselectionRequest(data, ctx)` – route `canvas.component.deselect.requested` (or equivalent) to the deselection sequence.
- Add `deselect.requested.json` mirroring `select.requested.json`:
  - Single beat: handler `routeDeselectionRequest` to play the appropriate sequence.
- Support both single-ID and clear-all scenarios: if `data.id` is present, route to `canvas.component.deselect`; otherwise to `canvas.component.deselect.all`.

**4. Update Main Plugin Exports**
- Export new handlers from `src/index.ts` so JSON sequences can mount them:
  - `routeDeselectionRequest`, `deselectComponent`, `clearAllSelections`, `hideAllOverlays`.

### Phase 3: Testing & Topics

**5. Create Comprehensive Tests (Vitest)**
- Single component deselection:
  - Hides `#rx-selection-overlay` and, when applicable, `#rx-adv-line-overlay` if they target the ID.
  - Publishes `canvas.component.deselection.changed` with `{ id }`.
- Clear all selections:
  - Hides both overlays regardless of their current target.
  - Publishes `canvas.component.selections.cleared`.
- Routing:
  - `routeDeselectionRequest` plays the correct sequence based on presence/absence of `data.id`.
- Graceful behavior:
  - No-throw when overlays are missing or conductor is absent.

**6. Deselection Topic Publishing**
- `canvas.component.deselection.changed` – single component deselected
- `canvas.component.selections.cleared` – all selections cleared
- Follow the existing `publishSelectionChanged` style: use `EventRouter.publish(..., ctx?.conductor)` and be tolerant of missing conductor.
- Prefer topics over direct Control Panel sequence calls. There is no explicit Control Panel “hide” sequence in this repo; UI should subscribe to the deselection topics.

### Phase 4: Integration

**7. Update Plugin Manifest**
- Add new sequences to `json-sequences/canvas-component/index.json`:
  - `deselect.requested.json`, `deselect.json`, `deselect-all.json`
- Ensure `handlersPath` points to `@renderx-plugins/canvas-component`.

### Key Design Decisions

1. Mirror selection architecture including topic-first request routing (adds `deselect.requested.json`).
2. Use topic-based events for UI synchronization; avoid hard dependency on Control Panel sequences for deselection.
3. Manage both overlay types (standard + advanced line) when deselecting.
4. Maintain backward compatibility; do not alter selection behavior.
5. Add comprehensive tests for new functionality.

### Implementation Order
1. Core handlers (Phase 1)
2. Event routing + `deselect.requested.json` (Phase 2)
3. Tests (Phase 3)
4. Manifest updates (Phase 4)

This plan ensures deselection integrates seamlessly with the existing selection system while adhering to the plugin’s architectural patterns and test coverage standards.