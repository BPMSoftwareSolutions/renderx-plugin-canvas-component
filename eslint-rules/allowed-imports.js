export default {
  rules: {
    "only-allowed": {
      meta: {
        type: "problem",
        docs: {
          description:
            "Allow only approved bare-module imports in canvas-component runtime; relative imports are fine.",
        },
        schema: [
          {
            type: "object",
            properties: {
              allow: { type: "array", items: { type: "string" } },
            },
            additionalProperties: false,
          },
        ],
        messages: {
          notAllowed:
            "Bare import '{{name}}' is not allowed in this package. Use the host SDK or approved modules.",
        },
      },
      create(context) {
        const options = context.options?.[0] || {};
        const allow = new Set(
          options.allow || [
            "@renderx-plugins/host-sdk",
            "@renderx-plugins/manifest-tools",
            "react",
            "react-dom",
            "gif.js.optimized",
          ]
        );
        function isRelative(spec) {
          return spec.startsWith("./") || spec.startsWith("../");
        }
        return {
          ImportDeclaration(node) {
            const name = node.source?.value;
            if (!name || typeof name !== "string") return;
            if (isRelative(name)) return; // always allow local relative
            if (!allow.has(name)) {
              context.report({ node, messageId: "notAllowed", data: { name } });
            }
          },
          CallExpression(node) {
            // Handle dynamic import('x')
            const callee = node.callee;
            if (callee?.type === "Import" && node.arguments?.length === 1) {
              const arg = node.arguments[0];
              if (arg.type === "Literal" && typeof arg.value === "string") {
                const name = arg.value;
                if (!isRelative(name) && !allow.has(name)) {
                  context.report({ node, messageId: "notAllowed", data: { name } });
                }
              }
            }
          },
        };
      },
    },
  },
};

