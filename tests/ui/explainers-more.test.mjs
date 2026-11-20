// Run: node tests/ui/explainers-more.test.mjs
import assert from "node:assert/strict";
import { test } from "node:test";
import { METRICS } from "../../evals-lab/src/evals/engine.js";
import { STAGES } from "../../evals-lab/src/ui/lessons.js";
import { STAGE_TOOLS } from "../../evals-lab/src/ui/stage-tools.js";
import { MORE_EXPLAIN, stageExplainId } from "../../evals-lab/src/ui/explainers-more.js";
import { VISUAL_IDS } from "../../evals-lab/src/ui/node-visuals.js";

const words = (s) => s.trim().split(/\s+/).length;
const ids = [...METRICS.map((m) => m.id), ...STAGES.map((s) => stageExplainId(s.id))];

test("every check and every diagram box has an explainer, and nothing else does", () => {
  assert.deepEqual(Object.keys(MORE_EXPLAIN).sort(), [...ids].sort());
});

test("what and why are non-empty, 15 words or fewer, one sentence", () => {
  for (const id of ids)
    for (const part of ["what", "why"]) {
      const t = MORE_EXPLAIN[id][part];
      assert.equal(typeof t, "string", `${id}.${part}`);
      assert.ok(t.trim().length > 0, `${id}.${part} is empty`);
      assert.ok(words(t) <= 15, `${id}.${part} has ${words(t)} words: ${t}`);
      assert.equal((t.match(/[.!?](\s|$)/g) ?? []).length, 1, `${id}.${part} is not one sentence: ${t}`);
    }
});

test("every id has a pictogram", () => {
  for (const id of ids) assert.ok(VISUAL_IDS.includes(id), `${id}: no pictogram`);
});

test("every diagram box has open-source tools", () => {
  for (const s of STAGES) assert.ok(STAGE_TOOLS[s.id]?.length >= 2, `${s.id}: tools`);
});
