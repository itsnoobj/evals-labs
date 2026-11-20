// Run: node tests/ui/node-explainers.test.mjs
import assert from "node:assert/strict";
import { test } from "node:test";
import { NODE_IDS } from "../../evals-lab/src/ui/wiring-graph.js";
import { NODE_EXPLAIN } from "../../evals-lab/src/ui/node-explainers.js";

const words = (s) => s.trim().split(/\s+/).length;
const allIds = [...new Set([...NODE_IDS.careful, ...NODE_IDS.simple])];

test("every node id has an explainer, and nothing else does", () => {
  assert.deepEqual(Object.keys(NODE_EXPLAIN).sort(), [...allIds].sort());
});

test("what and why are non-empty, 15 words or fewer, one sentence", () => {
  for (const id of allIds)
    for (const part of ["what", "why"]) {
      const t = NODE_EXPLAIN[id][part];
      assert.equal(typeof t, "string", `${id}.${part}`);
      assert.ok(t.trim().length > 0, `${id}.${part} is empty`);
      assert.ok(words(t) <= 15, `${id}.${part} has ${words(t)} words: ${t}`);
      assert.equal((t.match(/[.!?](\s|$)/g) ?? []).length, 1, `${id}.${part} is not one sentence: ${t}`);
    }
});
