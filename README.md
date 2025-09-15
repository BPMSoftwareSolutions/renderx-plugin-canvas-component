# @renderx-plugins/canvas-component

High‑frequency interaction & manipulation layer for the RenderX Canvas. Whereas `@renderx-plugins/canvas` owns the visual shell, this plugin implements (or will house) the performance‑sensitive handlers and symphonies that mutate component state, coordinate selection, and broker export / import lifecycles.

## Introduction
Modern design tooling demands responsive drag, resize, selection, and export pipelines without blocking UI rendering. This plugin concentrates those concerns into isolated, testable handler collections ("symphonies"), each describing a cohesive interaction domain (drag, create, resize, select, update, import/export, etc.). By centralizing the mutation + routing logic here we keep the Canvas surface lean and allow targeted optimization (rAF batching, microtask bursts, threshold gating) where it matters.

## Core Features & Capabilities
| Domain | Capabilities | Performance / Reliability Techniques |
| ------ | ------------ | ------------------------------------- |
| Drag & Move | Start / move / end events; position coalescing; Control Panel sync | rAF or microtask coalescing, threshold gating for first move, topic publish with fallback interaction routing |
| Create | Component & container instantiation at drop coordinates | Normalized coordinate math; callbacks for lifecycle (onCreated, drag continuation) |
| Selection | Primary element tracking, selection change broadcast | EventRouter topic `canvas.component.selection.changed`; idempotent register to avoid duplicate listeners |
| Resize | Placeholder (planned) for edge/corner handles & aspect constraints | Will reuse drag coalescing primitives; snap grid awareness roadmap |
| Update | Generic component property mutation flows | Batched routing to minimize conductor.play invocations |
| Export (SVG→GIF / MP4) | Trigger animated or static exports for selected element | Interaction resolution (`canvas.component.export*`) with element existence validation |
| Import | Declarative `.ui` (or future format) ingestion | Topic `canvas.component.import.requested` enabling pluggable parsers |
| Performance Profiling Hooks | Optional debug + perf flags (`perf.cp.*`) | Feature flag gating; deferred Control Panel rerender scheduling |

## Architectural Highlights
1. Topic First, Interaction Fallback: Publish to `EventRouter`; fallback to direct `resolveInteraction()` ensuring resilience if routing plugin order changes.
2. Idempotent Registration: `register(conductor)` sets a private sentinel; safe for multiple calls by host bootstraps or hot reload.
3. Coalesced High-Frequency Paths: Drag + update streams batch into animation frames (or microtasks) reducing layout thrash & CP churn.
4. Test Determinism: In `NODE_ENV=test` coalescing shortcuts are disabled for predictable unit specs.
5. Deferred Rendering: Post-drag control panel rendering may be delayed based on performance flags to smooth heavy layouts.

## Public Surface
```ts
import { register } from '@renderx-plugins/canvas-component';
// After migration:
import { handlers as dragHandlers } from '@renderx-plugins/canvas-component/symphonies/drag';
```
Local (staging) name: `@renderx-plugins/canvas-component-local`.

### `register(conductor)`
Sets `_canvasComponentRegistered` on the conductor to avoid duplicate subscription / mounting logic. Currently defers sequence mounting to JSON catalogs (keeping boot cost low).

## Drag Interaction Deep Dive (Example)
The drag symphony:
- Publishes lightweight topics for start / move / end (`canvas.component.drag.*`).
- Falls back to direct interaction play if the router is unavailable.
- Caches resolved interaction routes to avoid repeating expensive resolution during high‑frequency movement.
- Applies microtask‑first flush for the first update, then rAF scheduling to balance latency vs. paint timing.
- Channels Control Panel update requests through a single coalesced dispatch per frame.

## Extending With a New Symphony
1. Create `src/symphonies/<name>/<name>.symphony.ts`.
2. Export a stable `handlers` object (pure functions where possible).
3. Add any sequence definitions to JSON catalogs (if runtime mounted) or route keys consumed by other plugins.
4. Expose via subpath export (`./symphonies/*`).
5. Add focused tests (happy path + high‑frequency stress scenario).

## Event & Interaction Keys (Representative)
| Purpose | Topic / Interaction Key |
| ------- | ----------------------- |
| Drag start notification | `canvas.component.drag.start` |
| Drag move stream | `canvas.component.drag.move` |
| Drag end notification | `canvas.component.drag.end` |
| Selection changed | `canvas.component.selection.changed` |
| Component drop request | `library.component.drop.requested` |
| Container drop request | `library.container.drop.requested` |
| Export (generic) | `canvas.component.export` (resolved) |
| Export GIF | `canvas.component.export.gif` |
| Export MP4 | `canvas.component.export.mp4` |
| Import request | `canvas.component.import.requested` |

## Performance Flags (Illustrative)
| Flag | Effect |
| ---- | ------ |
| `perf.cp.debug` | Enables verbose console diagnostics for drag lifecycle. |
| `perf.cp.render.dedupe` | Allows deferred Control Panel rerender after drag end. |
| `perf.microtaskFirstUpdate` (planned) | Toggle microtask-first coalescing strategy. |

## Source Layout (During Extraction)
`src/symphonies/*` currently re-exports legacy implementations from `plugins/canvas-component/*`. Each will be inlined here so the package becomes self-contained.

## Roadmap
- Inline all legacy handler code (remove deep relative exports).
- Add resize + rotate symphonies.
- Introduce snapping grid & alignment guides (consumer opt-in events).
- Structured telemetry hooks (duration, frame skip counts, coalescing stats).
- Tree-shakable feature flags via build-time conditionals.

## Contributing (Local)
1. Implement or adjust a handler in the `src/symphonies` directory or other relevant source files.
2. Run `npm run build` to build the package.
3. Execute tests: `npm test`.
4. Run lint checks: `npm run lint`.
5. For development, use: `npm run dev`.
6. Measure latency (add temporary perf logs if needed under `perf.cp.debug`).

## Testing Strategy
Write unit tests that assert:
- Correct topic publication order & payload shape.
- Coalescing (only one CP update per frame) when simulating multiple rapid move calls.
- Fallback path to direct interaction play when `EventRouter.publish` throws.
- Deterministic behavior in test mode (no async scheduling side-effects).

## License
Inherits root project license (clarify on extraction / publish).

---
Purpose-built for performance, resilience, and incremental evolution—this interaction layer lets the Canvas stay visually simple while complex orchestration scales independently.
