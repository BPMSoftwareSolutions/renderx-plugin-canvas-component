import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";
import allowedImports from "./eslint-rules/allowed-imports.js";

export default [
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    ignores: ["dist/**", "node_modules/**"],
    languageOptions: {
      parser: tsparser,
      parserOptions: { ecmaVersion: "latest", sourceType: "module" },
    },
    plugins: { "@typescript-eslint": tseslint },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  // Boundary: do not import from repo-level plugins/** or escape the package root
  {
    files: ["src/**/*.{ts,tsx,js,jsx}"],
    plugins: {
      "allowed-imports": allowedImports,
    },
    rules: {
      // Disallow escaping the package root or reaching into repo plugins/**
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            "**/plugins/**",
            "../../*",
            "../../../*",
            "../../../../*",
          ],
        },
      ],
      // Allow only approved bare-module imports (relative imports always allowed)
      "allowed-imports/only-allowed": [
        "error",
        {
          allow: [
            "@renderx-plugins/host-sdk",
            "@renderx-plugins/manifest-tools",
            "react",
            "react-dom",
            "gif.js.optimized",
          ],
        },
      ],
    },
  },
  // Temporary exceptions for Phase 1 re-export shims until true externalization
  {
    files: ["src/index.ts", "src/symphonies/**/*.ts"],
    rules: {
      "no-restricted-imports": "off",
      "allowed-imports/only-allowed": "off",
    },
  },
];

