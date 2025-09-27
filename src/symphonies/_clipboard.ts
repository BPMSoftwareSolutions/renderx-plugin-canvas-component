// Clipboard fallback with persistence for headless/CI or when navigator.clipboard is unavailable
// Strategy:
// - Keep an in-memory buffer for fast local use
// - Also persist to sessionStorage (preferred) and fall back to localStorage to survive reloads
// - Reads check memory first, then sessionStorage, then localStorage
let _text = "";
const KEY = "renderx.clipboard.text";

function safeGetStorage(storage: Storage | undefined | null, key: string): string {
  try {
    const v = storage?.getItem?.(key);
    return typeof v === "string" ? v : "";
  } catch {
    return "";
  }
}

function safeSetStorage(storage: Storage | undefined | null, key: string, value: string): void {
  try {
    storage?.setItem?.(key, value);
  } catch {
    // ignore
  }
}

export function setClipboardText(text: string) {
  _text = String(text || "");
  // Best-effort persistence
  const w = (globalThis as any) as { sessionStorage?: Storage; localStorage?: Storage };
  safeSetStorage(w?.sessionStorage, KEY, _text);
  // Also mirror to localStorage in case sessionStorage not available
  safeSetStorage(w?.localStorage, KEY, _text);
}

export function getClipboardText(): string {
  if (_text) return _text;
  const w = (globalThis as any) as { sessionStorage?: Storage; localStorage?: Storage };
  const fromSession = safeGetStorage(w?.sessionStorage, KEY);
  if (fromSession) {
    _text = fromSession;
    return fromSession;
  }
  const fromLocal = safeGetStorage(w?.localStorage, KEY);
  if (fromLocal) {
    _text = fromLocal;
    return fromLocal;
  }
  return "";
}
