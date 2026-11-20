// Run: node tests/task/recorded-runs.test.mjs
// recorded-runs.json is replayed by the page, so it must match the current cases.js: known case ids and tool outputs equal to what runTool returns now.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CASES, runTool } from "../../evals-lab/src/task/cases.js";

const rec = JSON.parse(readFileSync(new URL("../../evals-lab/data/recorded-runs.json", import.meta.url), "utf8"));
const runs = [...rec.free, ...rec.constrained];
const ids = new Set(CASES.map((c) => c.id));

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log(`ok  ${name}`);
}

check("5 recorded runs per case in each mode", () => {
  for (const mode of ["free", "constrained"])
    for (const c of CASES) assert.equal(rec[mode].filter((r) => r.caseId === c.id).length, 5, `${mode} ${c.id}`);
});

check("every recorded run's caseId exists in CASES", () => {
  for (const r of runs) assert.ok(ids.has(r.caseId), r.caseId);
});

check("every recorded tool step output equals what runTool returns now", () => {
  let steps = 0;
  for (const r of runs)
    for (const s of r.steps)
      if (s.kind === "tool") {
        steps += 1;
        assert.deepEqual(s.output, runTool(s.tool, s.args), `${r.caseId} ${s.tool} ${JSON.stringify(s.args)}`);
      }
  assert.ok(steps > 0);
});

console.log(`\n${passed} checks passed`);
