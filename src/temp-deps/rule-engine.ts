// Minimal rule engine for Phase 2: update/content/extract rules
// Mirrors the acceptance criteria and current behavior to avoid regressions.
import { sanitizeHtml } from "./sanitizeHtml";

export type UpdateRule =
  | { whenAttr: string; action: "textContent"; valueFrom?: "value" }
  | { whenAttr: string; action: "style"; prop: string }
  | { whenAttr: string; action: "stylePx"; prop: string }
  | { whenAttr: string; action: "boolAttr"; attr: string }
  | { whenAttr: string; action: "attr"; attr: string }
  | { whenAttr: string; action: "prop"; prop: string }
  | { whenAttr: string; action: "innerHtml" }
  | {
      whenAttr: string;
      action: "toggleClassVariant";
      base: string; // e.g. "rx-button"
      prefix: string; // e.g. "rx-button--" (but keep single-dash to match current tests in update)
      values?: string[]; // explicit values
      valuesFromSchemaEnum?: string; // placeholder for future use
    };

export type UpdateRulesConfig = {
  default: UpdateRule[];
  byType?: Record<string, UpdateRule[]>;
};

// Content application rules
export type ContentRule =
  | { action: "textFrom"; from?: string; fallback?: string }
  | { action: "dupTextToContent" } // helper to set content=el.textContent for button
  | { action: "attr"; attr: string; from: string; boolAttr?: boolean }
  | { action: "prop"; prop: string; from: string }
  | { action: "style"; prop: string; from: string }
  | { action: "innerHtml"; from: string }; // generic innerHTML setter for markup payloads (e.g., svg)

export type ContentRulesConfig = {
  default: ContentRule[];
  byType?: Record<string, ContentRule[]>;
};

// Extraction rules
export type ExtractRule =
  | { get: "textContent"; as: string }
  | { get: "attr"; attr: string; as: string }
  | { get: "hasAttr"; attr: string; as: string }
  | { get: "prop"; prop: string; as: string }
  | { get: "style"; prop: string; as: string }
  | { get: "innerHtml"; as: string }
  | {
      get: "classVariant";
      prefix: string;
      values: string[];
      as: string;
      fallback?: string;
    };

export type ExtractRulesConfig = {
  default: ExtractRule[];
  byType?: Record<string, ExtractRule[]>;
};

// Combined config for optional global/window loading
export type AllRulesConfig = {
  update?: UpdateRulesConfig;
  content?: ContentRulesConfig;
  extract?: ExtractRulesConfig;
};

let cachedAllRules: AllRulesConfig | null = null;

export function setAllRulesConfig(cfg: AllRulesConfig) {
  cachedAllRules = cfg;
}

export function loadAllRulesFromWindow() {
  try {
    const g: any = (globalThis as any) || {};
    const cfg = g?.RenderX?.componentRules;
    if (cfg && typeof cfg === "object") {
      cachedAllRules = cfg as AllRulesConfig;
    }
  } catch {}
}

export function getAllRulesConfig(): AllRulesConfig {
  if (!cachedAllRules) loadAllRulesFromWindow();
  return cachedAllRules || {};
}

// Default rules tuned to existing tests/behavior
const DEFAULT_UPDATE_RULES: UpdateRulesConfig = {
  default: [
    { whenAttr: "content", action: "textContent" },
    { whenAttr: "bg-color", action: "style", prop: "backgroundColor" },
    { whenAttr: "text-color", action: "style", prop: "color" },
    { whenAttr: "border-radius", action: "style", prop: "borderRadius" },
    { whenAttr: "font-size", action: "style", prop: "fontSize" },
    { whenAttr: "width", action: "stylePx", prop: "width" },
    { whenAttr: "height", action: "stylePx", prop: "height" },
    { whenAttr: "x", action: "stylePx", prop: "left" },
    { whenAttr: "y", action: "stylePx", prop: "top" },
    { whenAttr: "disabled", action: "boolAttr", attr: "disabled" },
  ],
  byType: {
    button: [
      // Keep single-dash variant names here to match current tests in attribute-editing.integration
      {
        whenAttr: "variant",
        action: "toggleClassVariant",
        base: "rx-button",
        prefix: "rx-button--",
        values: ["primary", "secondary", "danger"],
      },
      {
        whenAttr: "size",
        action: "toggleClassVariant",
        base: "rx-button",
        prefix: "rx-button--",
        values: ["small", "medium", "large"],
      },
      {
        whenAttr: "disabled",
        action: "boolAttr",
        attr: "disabled",
      },
    ],
    heading: [
      {
        whenAttr: "level",
        action: "toggleClassVariant",
        base: "rx-heading",
        prefix: "rx-heading--level-",
        values: ["h1", "h2", "h3", "h4", "h5", "h6"],
      },
      {
        whenAttr: "variant",
        action: "toggleClassVariant",
        base: "rx-heading",
        prefix: "rx-heading--",
        values: ["default", "center", "right"],
      },
      {
        whenAttr: "color",
        action: "style",
        prop: "color",
      },
      {
        whenAttr: "fontSize",
        action: "style",
        prop: "fontSize",
      },
    ],
    image: [
      {
        whenAttr: "src",
        action: "attr",
        attr: "src",
      },
      {
        whenAttr: "alt",
        action: "attr",
        attr: "alt",
      },
      {
        whenAttr: "variant",
        action: "toggleClassVariant",
        base: "rx-image",
        prefix: "rx-image--",
        values: [
          "default",
          "rounded",
          "circle",
          "bordered",
          "shadow",
          "zoom",
          "lift",
        ],
      },
      {
        whenAttr: "loading",
        action: "attr",
        attr: "loading",
      },
      {
        whenAttr: "objectFit",
        action: "style",
        prop: "objectFit",
      },
    ],
    input: [
      {
        whenAttr: "placeholder",
        action: "prop",
        prop: "placeholder",
      },
      {
        whenAttr: "inputType",
        action: "prop",
        prop: "type",
      },
      {
        whenAttr: "variant",
        action: "toggleClassVariant",
        base: "rx-input",
        prefix: "rx-input--",
        values: ["default", "error", "success"],
      },
      {
        whenAttr: "value",
        action: "prop",
        prop: "value",
      },
      {
        whenAttr: "disabled",
        action: "boolAttr",
        attr: "disabled",
      },
      {
        whenAttr: "required",
        action: "boolAttr",
        attr: "required",
      },
    ],
    line: [
      {
        whenAttr: "stroke",
        action: "attr",
        attr: "stroke",
      },
      {
        whenAttr: "thickness",
        action: "attr",
        attr: "data-thickness",
      },
    ],
    svg: [
      { whenAttr: "viewBox", action: "attr", attr: "viewBox" },
      {
        whenAttr: "preserveAspectRatio",
        action: "attr",
        attr: "preserveAspectRatio",
      },
      { whenAttr: "svgMarkup", action: "innerHtml" },
    ],
    paragraph: [
      {
        whenAttr: "content",
        action: "textContent",
      },
      {
        whenAttr: "variant",
        action: "toggleClassVariant",
        base: "rx-paragraph",
        prefix: "rx-paragraph--",
        values: [
          "default",
          "center",
          "right",
          "justify",
          "small",
          "large",
          "bold",
          "light",
        ],
      },
      {
        whenAttr: "color",
        action: "style",
        prop: "color",
      },
      {
        whenAttr: "fontSize",
        action: "stylePx",
        prop: "fontSize",
      },
      {
        whenAttr: "lineHeight",
        action: "style",
        prop: "lineHeight",
      },
    ],
    html: [{ whenAttr: "markup", action: "innerHtml" }],
  },
};

const DEFAULT_CONTENT_RULES: ContentRulesConfig = {
  default: [{ action: "textFrom", from: "text" }],
  byType: {
    button: [
      { action: "textFrom", from: "content" },
      { action: "attr", attr: "disabled", from: "disabled", boolAttr: true },
    ],
    input: [
      { action: "prop", prop: "placeholder", from: "placeholder" },
      { action: "prop", prop: "value", from: "value" },
      { action: "prop", prop: "type", from: "inputType" },
      { action: "prop", prop: "disabled", from: "disabled" },
      { action: "prop", prop: "required", from: "required" },
    ],
    img: [
      { action: "attr", attr: "src", from: "src" },
      { action: "attr", attr: "alt", from: "alt" },
      { action: "attr", attr: "loading", from: "loading" },
      { action: "style", prop: "objectFit", from: "objectFit" },
    ],
    image: [
      { action: "attr", attr: "src", from: "src" },
      { action: "attr", attr: "alt", from: "alt" },
      { action: "attr", attr: "loading", from: "loading" },
      { action: "style", prop: "objectFit", from: "objectFit" },
    ],
    container: [{ action: "textFrom", from: "text" }],
    div: [{ action: "textFrom", from: "text" }],
    heading: [{ action: "textFrom", from: "content", fallback: "" }],
    line: [
      { action: "attr", attr: "stroke", from: "stroke" },
      { action: "attr", attr: "data-thickness", from: "thickness" },
    ],
    svg: [
      { action: "attr", attr: "viewBox", from: "viewBox" },
      {
        action: "attr",
        attr: "preserveAspectRatio",
        from: "preserveAspectRatio",
      },
      { action: "innerHtml", from: "svgMarkup" },
    ],
    paragraph: [
      { action: "textFrom", from: "content" },
      { action: "style", prop: "color", from: "color" },
      { action: "style", prop: "fontSize", from: "fontSize" },
      { action: "style", prop: "lineHeight", from: "lineHeight" },
    ],
    html: [{ action: "innerHtml", from: "markup" }],
  },
};

const DEFAULT_EXTRACT_RULES: ExtractRulesConfig = {
  default: [{ get: "textContent", as: "text" }],
  byType: {
    button: [
      { get: "textContent", as: "content" },
      {
        get: "classVariant",
        prefix: "rx-button--",
        values: ["primary", "secondary", "danger"],
        as: "variant",
        fallback: "primary",
      },
      {
        get: "classVariant",
        prefix: "rx-button--",
        values: ["small", "medium", "large"],
        as: "size",
        fallback: "medium",
      },
      { get: "hasAttr", attr: "disabled", as: "disabled" },
    ],
    input: [
      { get: "prop", prop: "placeholder", as: "placeholder" },
      { get: "prop", prop: "value", as: "value" },
      { get: "prop", prop: "type", as: "inputType" },
      {
        get: "classVariant",
        prefix: "rx-input--",
        values: ["default", "error", "success"],
        as: "variant",
        fallback: "default",
      },
      { get: "hasAttr", attr: "disabled", as: "disabled" },
      { get: "hasAttr", attr: "required", as: "required" },
    ],
    img: [
      { get: "attr", attr: "src", as: "src" },
      { get: "attr", attr: "alt", as: "alt" },
      { get: "attr", attr: "loading", as: "loading" },
      { get: "style", prop: "objectFit", as: "objectFit" },
    ],
    image: [
      { get: "attr", attr: "src", as: "src" },
      { get: "attr", attr: "alt", as: "alt" },
      { get: "attr", attr: "loading", as: "loading" },
      {
        get: "classVariant",
        prefix: "rx-image--",
        values: [
          "default",
          "rounded",
          "circle",
          "bordered",
          "shadow",
          "zoom",
          "lift",
        ],
        as: "variant",
        fallback: "default",
      },
      { get: "style", prop: "objectFit", as: "objectFit" },
    ],
    container: [{ get: "textContent", as: "text" }],
    div: [{ get: "textContent", as: "text" }],
    heading: [
      { get: "textContent", as: "content" },
      {
        get: "classVariant",
        prefix: "rx-heading--level-",
        values: ["h1", "h2", "h3", "h4", "h5", "h6"],
        as: "level",
        fallback: "tagName",
      },
      {
        get: "classVariant",
        prefix: "rx-heading--",
        values: ["default", "center", "right"],
        as: "variant",
        fallback: "default",
      },
      { get: "style", prop: "color", as: "color" },
      { get: "style", prop: "fontSize", as: "fontSize" },
    ],
    line: [
      { get: "attr", attr: "stroke", as: "stroke" },
      { get: "attr", attr: "data-thickness", as: "thickness" },
    ],
    svg: [
      { get: "attr", attr: "viewBox", as: "viewBox" },
      { get: "attr", attr: "preserveAspectRatio", as: "preserveAspectRatio" },
      { get: "innerHtml", as: "svgMarkup" },
    ],
    paragraph: [
      { get: "textContent", as: "content" },
      {
        get: "classVariant",
        prefix: "rx-paragraph--",
        values: [
          "default",
          "center",
          "right",
          "justify",
          "small",
          "large",
          "bold",
          "light",
        ],
        as: "variant",
        fallback: "default",
      },
      { get: "style", prop: "color", as: "color" },
      { get: "style", prop: "fontSize", as: "fontSize" },
      { get: "style", prop: "lineHeight", as: "lineHeight" },
    ],
    html: [{ get: "innerHtml", as: "markup" }],
  },
};

function getComponentTypeFromClasses(el: HTMLElement): string {
  const typeClass = Array.from(el.classList).find(
    (c) => c.startsWith("rx-") && c !== "rx-comp"
  );
  return typeClass ? typeClass.replace("rx-", "") : el.tagName.toLowerCase();
}

export class ComponentRuleEngine {
  private updateRules: UpdateRulesConfig;
  private contentRules: ContentRulesConfig;
  private extractRules: ExtractRulesConfig;

  constructor(
    updateRules?: UpdateRulesConfig,
    contentRules?: ContentRulesConfig,
    extractRules?: ExtractRulesConfig
  ) {
    const all = getAllRulesConfig();
    this.updateRules = updateRules || all.update || DEFAULT_UPDATE_RULES;
    this.contentRules = contentRules || all.content || DEFAULT_CONTENT_RULES;
    this.extractRules = extractRules || all.extract || DEFAULT_EXTRACT_RULES;
  }

  // -------- Update --------
  getUpdateRulesFor(el: HTMLElement): UpdateRule[] {
    const type = getComponentTypeFromClasses(el);
    const typeRules = this.updateRules.byType?.[type] || [];
    return [...this.updateRules.default, ...typeRules];
  }

  applyUpdate(el: HTMLElement, attribute: string, value: any) {
    const rules = this.getUpdateRulesFor(el);
    const rule = rules.find((r) => r.whenAttr === attribute);
    if (!rule) return false;

    switch (rule.action) {
      case "textContent": {
        el.textContent = String(value);
        return true;
      }
      case "style": {
        (el.style as any)[(rule as any).prop] = String(value);
        return true;
      }
      case "stylePx": {
        (el.style as any)[(rule as any).prop] = `${Number(value)}px`;
        return true;
      }
      case "boolAttr": {
        const attr = (rule as any).attr as string;
        if (value) el.setAttribute(attr, "true");
        else el.removeAttribute(attr);
        return true;
      }
      case "attr": {
        const attr = (rule as any).attr as string;
        el.setAttribute(attr, String(value));
        return true;
      }
      case "prop": {
        const prop = (rule as any).prop as string;
        (el as any)[prop] = value;
        return true;
      }
      case "innerHtml": {
        const raw = String(value ?? "");
        const type = getComponentTypeFromClasses(el);
        (el as any).innerHTML = type === "html" ? sanitizeHtml(raw) : raw;
        return true;
      }
      case "toggleClassVariant": {
        const { base, prefix, values } = rule as any;
        const classes = Array.from(el.classList);

        // If explicit values are provided, only clear those specific class variants.
        // This prevents clobbering other dimensions (e.g., size vs variant) that share the same prefix.
        const hasExplicitValues = Array.isArray(values) && values.length > 0;
        const allowedTargets: string[] = hasExplicitValues
          ? (values as string[]).flatMap((v) => {
              const full = `${prefix}${v}`;
              // Also include legacy single-dash form if applicable
              if (prefix.includes("--")) {
                const legacy = `${prefix.replace("--", "-")}${v}`;
                return [full, legacy];
              }
              return [full];
            })
          : [];

        // Build list of prefixes to clear (legacy behavior) only when no explicit values are supplied
        const prefixesToClear: string[] = hasExplicitValues
          ? []
          : [
              prefix,
              ...(prefix.includes("--") ? [prefix.replace("--", "-")] : []),
            ];

        // Collect classes to remove: preserve base class exactly
        for (const c of classes) {
          if (c === base) continue;
          if (
            (hasExplicitValues && allowedTargets.includes(c)) ||
            (!hasExplicitValues && prefixesToClear.some((p) => c.startsWith(p)))
          ) {
            el.classList.remove(c);
          }
        }

        // Add new variant class
        const val = String(value);
        if (val) el.classList.add(`${prefix}${val}`);
        return true;
      }
    }
  }

  // -------- Content apply --------
  applyContent(
    el: HTMLElement,
    tagOrType: string,
    content: Record<string, any>
  ) {
    if (!content || typeof content !== "object") return;
    const typeKey = String(tagOrType || "").toLowerCase();
    const rules: ContentRule[] = [
      ...(this.contentRules.default || []),
      ...((this.contentRules.byType?.[typeKey] as ContentRule[]) || []),
    ];

    for (const r of rules) {
      switch (r.action) {
        case "textFrom": {
          const v = (content as any)[(r as any).from] ?? (r as any).fallback;
          if (v !== undefined) el.textContent = String(v);
          break;
        }
        case "attr": {
          const v = (content as any)[(r as any).from];
          if ((r as any).boolAttr) {
            if (v) el.setAttribute((r as any).attr, "");
            else el.removeAttribute((r as any).attr);
          } else if (v !== undefined) {
            el.setAttribute((r as any).attr, String(v));
          }
          break;
        }
        case "prop": {
          const v = (content as any)[(r as any).from];
          if (v !== undefined) (el as any)[(r as any).prop] = v;
          break;
        }
        case "style": {
          const v = (content as any)[(r as any).from];
          if (v !== undefined) (el.style as any)[(r as any).prop] = String(v);
          break;
        }
        case "innerHtml": {
          const v = (content as any)[(r as any).from];
          if (v !== undefined) {
            const raw = String(v);
            (el as any).innerHTML =
              typeKey === "html" ? sanitizeHtml(raw) : raw;
          }
          break;
        }
      }
    }
  }

  // -------- Content extract --------
  extractContent(el: HTMLElement, typeHint?: string): Record<string, any> {
    const out: Record<string, any> = {};
    const type = String(
      typeHint || getComponentTypeFromClasses(el) || ""
    ).toLowerCase();
    const rules: ExtractRule[] = [
      ...(this.extractRules.default || []),
      ...((this.extractRules.byType?.[type] as ExtractRule[]) || []),
    ];
    for (const r of rules) {
      switch (r.get) {
        case "textContent": {
          const txt = el.textContent?.trim();
          if (txt) out[(r as any).as] = txt;
          break;
        }
        case "attr": {
          const val = el.getAttribute((r as any).attr);
          if (val != null) out[(r as any).as] = val;
          break;
        }
        case "hasAttr": {
          out[(r as any).as] = el.hasAttribute((r as any).attr) || false;
          break;
        }
        case "prop": {
          const prop = (r as any).prop;
          let v = (el as any)[prop];
          if (v != null && v !== "") {
            if (prop === "tagName") v = String(v).toLowerCase();
            out[(r as any).as] = v;
          }
          break;
        }
        case "style": {
          const v = (el.style as any)[(r as any).prop];
          if (v) out[(r as any).as] = v;
          break;
        }
        case "innerHtml": {
          const html = (el as any).innerHTML;
          if (html && html.trim().length) out[(r as any).as] = html;
          break;
        }
        case "classVariant": {
          const rule = r as any;
          const prefix = rule.prefix;
          const values: string[] = rule.values || [];
          const fallback = rule.fallback;

          // Find any class matching the allowed values with the given prefix
          const classes = Array.from(el.classList);
          const match = classes.find((cls) => {
            if (!cls.startsWith(prefix)) return false;
            const variant = cls.slice(prefix.length);
            return values.includes(variant);
          });

          if (match) {
            out[rule.as] = match.slice(prefix.length);
            break;
          }

          // Fallback logic
          if (fallback === "tagName") {
            const tagName = el.tagName?.toLowerCase();
            if (tagName && values.includes(tagName)) {
              out[rule.as] = tagName;
            }
          } else if (fallback) {
            out[rule.as] = fallback;
          }
          break;
        }
      }
    }
    return out;
  }
}
