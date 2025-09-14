// Lightweight HTML sanitizer wrapper. Intentionally minimal to avoid new deps initially.
// If stronger guarantees needed, install DOMPurify and swap implementation.

const ALLOWED_TAGS = new Set([
  "a",
  "b",
  "strong",
  "i",
  "em",
  "u",
  "s",
  "p",
  "br",
  "span",
  "ul",
  "ol",
  "li",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "blockquote",
  "code",
  "pre",
  "img",
  "svg",
  "path",
  "rect",
  "circle",
  "g",
  "div",
  "form",
  "button",
  "input",
  "label",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  // Extended SVG support for richer samples
  "text",
  "line",
  "polyline",
  "polygon",
  "ellipse",
  "defs",
  "lineargradient",
  "stop",
  "animate",
  "animatetransform",
]);
const URL_ATTRS = new Set(["href", "src"]);
const ALLOWED_PROTOCOLS = ["http:", "https:", "mailto:", "data:"]; // data: still filtered to images below

function isDataImage(value: string) {
  return /^data:image\/(png|jpe?g|gif|webp|svg\+xml);base64,[a-z0-9+/=\s]+$/i.test(
    value.trim()
  );
}

export function sanitizeHtml(input: string): string {
  if (!input || typeof input !== "string") return "";
  // Parse in a detached document
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${input}</div>`, "text/html");
  const container = doc.body.firstElementChild as HTMLElement | null;
  if (!container) return "";

  const walker = doc.createTreeWalker(container, NodeFilter.SHOW_ELEMENT, null);
  const remove: Element[] = [];
  while (walker.nextNode()) {
    const el = walker.currentNode as HTMLElement;
    const tag = el.tagName.toLowerCase();

    if (!ALLOWED_TAGS.has(tag)) {
      // Replace disallowed element with its text content (or children) by unwrapping
      // Scripts/styles if present → drop entirely
      if (tag === "script" || tag === "style") {
        remove.push(el);
        continue;
      }
      // unwrap: move children before el
      while (el.firstChild) el.parentNode?.insertBefore(el.firstChild, el);
      remove.push(el);
      continue;
    }

    // Remove event handler attrs & dangerous attributes
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      const value = attr.value;
      if (name.startsWith("on")) {
        el.removeAttribute(attr.name);
        continue;
      }
      if (name === "style") {
        // Optional: keep? For now allow basic inline styles but strip expressions
        if (/expression\s*\(/i.test(value)) el.removeAttribute(attr.name);
        continue;
      }
      if (URL_ATTRS.has(name)) {
        try {
          const a = doc.createElement("a");
          a.href = value; // browser URL parser
          const protocol = a.protocol;
          if (!ALLOWED_PROTOCOLS.includes(protocol)) {
            el.removeAttribute(attr.name);
            continue;
          }
          if (protocol === "data:" && !isDataImage(value)) {
            el.removeAttribute(attr.name);
            continue;
          }
          // OK
        } catch {
          el.removeAttribute(attr.name);
        }
      }
    }
  }
  for (const el of remove) el.remove();
  return container.innerHTML;
}
