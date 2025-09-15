// Feature flags module for testing
// This provides flag override functionality for tests

const flagOverrides = new Map<string, boolean>();

export function setFlagOverride(flag: string, value: boolean): void {
  flagOverrides.set(flag, value);
}

export function clearFlagOverrides(): void {
  flagOverrides.clear();
}

export function getFlagOverride(flag: string): boolean | undefined {
  return flagOverrides.get(flag);
}

export function isFlagEnabled(flag: string): boolean {
  const override = flagOverrides.get(flag);
  if (override !== undefined) {
    return override;
  }
  
  // Default flag values for testing
  const defaults: Record<string, boolean> = {
    'lineAdvanced': false,
    'perf.drag.use-transform': false,
    'perf.cp.debug': false,
    'perf.cp.render.dedupe': false,
  };
  
  return defaults[flag] ?? false;
}
