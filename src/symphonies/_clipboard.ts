// Simple in-memory clipboard fallback used in headless/CI where navigator.clipboard may be unavailable
let _text = "";

export function setClipboardText(text: string) {
  _text = String(text || "");
}

export function getClipboardText(): string {
  return _text || "";
}

