# @renderx-plugins/canvas-component

Experimental extraction of the Canvas Component plugin from the `renderx-plugins-demo` monorepo. This staged package is named `@renderx-plugins/canvas-component-local` while private.

## Status
- Development / staging
- Version: `0.0.0-private`
- Provides a lightweight `register()` and forwards symphony handler exports.
- Runtime sequences are mounted through JSON catalogs (see root `json-sequences/`).

## Exports
Primary entry:
```ts
import { register } from '@renderx-plugins/canvas-component';
```
Individual symphony handler modules (after migration) will be accessible via subpath exports:
```ts
import { handlers as dragHandlers } from '@renderx-plugins/canvas-component/symphonies/drag';
```
Locally (before publish) use the `-local` name:
```ts
import { register } from '@renderx-plugins/canvas-component-local';
import { handlers as dragHandlers } from '@renderx-plugins/canvas-component-local/symphonies/drag';
```

## `register(conductor)`
Idempotent; safe to call multiple times. It memoizes an internal flag (`_canvasComponentRegistered`) on the provided conductor to prevent duplicate setup. Currently it does not directly mount sequences—JSON catalogs handle that.

## Symphony Handlers
Each folder in `src/symphonies/*` (e.g. `drag`, `create`, `resize`) re-exports the real implementation from the legacy location under `plugins/canvas-component/symphonies/*`. During migration the source files will move into this package.

Example (drag.symphony.ts excerpt):
```ts
export * from '../../../../../plugins/canvas-component/symphonies/drag/drag.symphony';
```
`drag.symphony` contains logic to coalesce high-frequency position update events and forward them efficiently to the Control Panel via either the `EventRouter` or a resolved interaction route.

Key performance considerations implemented in `drag` handlers:
- Animation frame coalescing
- Microtask-first flush option (with rAF backup)
- Threshold gating of initial small deltas to reduce early churn
- Test-mode deterministic path (skips async coalescing)

## Build
```json
"build": "tsup src/index.ts src/symphonies/**/*.ts --format esm --splitting --out-dir dist --clean"
```
- Produces ESM output with code splitting for individual symphony chunks.
- Subpath exports (`./symphonies/*`) map to `src/symphonies/*`.

## Testing
```bash
npm -w @renderx-plugins/canvas-component-local run test
```
Runs `vitest` isolated to this package.

## Local Development Flow
1. Modify logic in `plugins/canvas-component/*` (authoritative pre-migration) or copy into `src/` as you migrate.
2. Run `npm run build:packages` at repo root.
3. Import from `@renderx-plugins/canvas-component-local` within the demo app or tests.
4. Gradually remove deep relative re-exports as real sources land in `src/`.

## Migration Checklist
- [ ] Move each symphony implementation into `src/symphonies/<name>/`.
- [ ] Update re-export stubs to local relative sources.
- [ ] Add public API hash + validation to CI.
- [ ] Remove `-local` suffix; set `private: false`.
- [ ] Tag an initial release (e.g. `0.1.0`).

## Publishing (future)
1. Rename in `package.json` to `@renderx-plugins/canvas-component`.
2. Set `private: false`.
3. Validate API hash + tests.
4. `npm publish --access public`.

## License
Inherits root project license (clarify upon extraction).
