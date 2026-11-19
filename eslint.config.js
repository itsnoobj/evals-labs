import js from "@eslint/js";
import globals from "globals";

export default [
  { ignores: ["benchmarks/", "node_modules/", "evals-lab/data/", "**/*.html"] },
  js.configs.recommended,
  {
    languageOptions: { ecmaVersion: "latest", sourceType: "module" },
    rules: {
      "no-unused-vars": ["error", { args: "after-used", ignoreRestSiblings: true, varsIgnorePattern: "^_" }],
      "no-undef": "error",
      "prefer-const": "error",
      eqeqeq: ["error", "smart"],
      "no-var": "error",
    },
  },
  { files: ["evals-lab/src/**/*.js"], languageOptions: { globals: globals.browser } },
  { files: ["tests/**/*.mjs", "scripts/**/*.mjs", "eslint.config.js"], languageOptions: { globals: globals.node } },
  {
    // These scripts pass callbacks to page.evaluate(), which run in the benchmark page, not in Node.
    files: ["scripts/record-runs.mjs", "scripts/run-benchmark.mjs"],
    languageOptions: { globals: { ...globals.browser, __bench: "readonly" } },
  },
];
