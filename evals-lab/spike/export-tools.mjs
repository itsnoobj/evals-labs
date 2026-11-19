// Writes tools-export.json so Python (make-dspy-prompt.py) reads the same card data as the browser lab.
// Run: node evals-lab/spike/export-tools.mjs
import { writeFileSync } from "node:fs";
import { CARDS, CATEGORIES, MERCHANTS, CASES } from "../cases.js";

const cases = CASES.map(({ id, query, merchant, amount, expected, expectedTrajectory }) => ({
  id, query, merchant, amount, expected, expectedTrajectory,
}));
const out = new URL("./tools-export.json", import.meta.url);
writeFileSync(out, JSON.stringify({ cards: CARDS, categories: CATEGORIES, merchants: MERCHANTS, cases }, null, 2) + "\n");
console.log(`wrote ${out.pathname} (${cases.length} cases)`);
