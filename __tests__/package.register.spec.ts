import { describe, it, expect, vi } from 'vitest';
import * as pkg from '../src/index';

function createFakeConductor() {
  const mounted: any[] = [];
  return {
    mounted,
    logger: { warn: vi.fn(), info: vi.fn() },
    async mount(seq: any, _handlers: any, pluginId: string) {
      mounted.push({ seq, pluginId });
    },
  } as any;
}

describe('@renderx-plugins/canvas-component: package surface + register()', () => {
  it('exposes handlers and a register(conductor) function', async () => {
    expect(typeof (pkg as any).handlers).toBe('object');
    expect(typeof (pkg as any).register).toBe('function');
  });

  it('register() is idempotent and sets a guard on the conductor', async () => {
    const c = createFakeConductor();
    await (pkg as any).register(c);
    await (pkg as any).register(c); // call twice — should be harmless

    // Guard is set only once
    expect((c as any)._canvasComponentRegistered).toBe(true);
  });
});

