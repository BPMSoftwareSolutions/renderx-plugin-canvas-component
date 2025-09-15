// Mock conductor module for testing
// This provides basic conductor functionality for tests

export interface Conductor {
  play: (pluginId: string, sequenceId: string, payload?: any) => Promise<any>;
  handlers: Record<string, any>;
  _canvasComponentRegistered?: boolean;
}

export async function initConductor(): Promise<Conductor> {
  const conductor: Conductor = {
    play: async (pluginId: string, sequenceId: string, payload?: any) => {
      // Mock implementation for tests
      return { pluginId, sequenceId, payload };
    },
    handlers: {},
  };
  
  return conductor;
}

export async function registerAllSequences(conductor: Conductor): Promise<void> {
  // Mock implementation - in real implementation this would load and register sequences
  conductor.handlers = {
    'canvas-component-create': () => {},
    'canvas-component-select': () => {},
    'canvas-component-drag': () => {},
    'canvas-component-resize': () => {},
  };
}

export async function loadJsonSequenceCatalogs(conductor: Conductor, pluginIds: string[]): Promise<void> {
  // Mock implementation - in real implementation this would load JSON sequence catalogs
  for (const pluginId of pluginIds) {
    conductor.handlers[`${pluginId.toLowerCase()}-handler`] = () => {};
  }
}
