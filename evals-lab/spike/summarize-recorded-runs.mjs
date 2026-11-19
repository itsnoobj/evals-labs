// Verifies recorded-runs.json against the CURRENT cases.js/engine.js/guarded-agent.js and prints the numbers used in RESULTS.md.
// Run from repo root: node evals-lab/spike/summarize-recorded-runs.mjs
import { readFileSync } from "node:fs";
import { CASES, runTool } from "../cases.js";
import { scoreRun, perStepAccuracy } from "../engine.js";
import { verifyRun, runGuarded, makeReplayChat } from "../guarded-agent.js";

const rec = JSON.parse(readFileSync(new URL("../recorded-runs.json", import.meta.url), "utf8"));
const ids = new Set(CASES.map((c) => c.id));
const byId = Object.fromEntries(CASES.map((c) => [c.id, c]));
const pct = (n, d) => `${n}/${d} = ${((100 * n) / d).toFixed(1)}%`;
const out = { counts: { free: rec.free.length, constrained: rec.constrained.length }, allCaseIdsValid: [...rec.free, ...rec.constrained].every((r) => ids.has(r.caseId)) };

// Every tool step's output must equal what the live tools return for the same tool and args.
let toolSteps = 0, outputMismatch = 0;
for (const r of [...rec.free, ...rec.constrained]) for (const s of r.steps) if (s.kind === "tool") {
  toolSteps += 1;
  if (JSON.stringify(s.output) !== JSON.stringify(runTool(s.tool, s.args))) outputMismatch += 1;
}
out.toolSteps = toolSteps;
out.outputMismatch = outputMismatch;

for (const mode of ["free", "constrained"]) {
  const runs = rec[mode];
  const pass = (rs) => rs.filter((r) => scoreRun(byId[r.caseId], r).task_success.pass).length;
  out[mode] = {
    taskSuccess: pct(pass(runs), runs.length),
    perCase: Object.fromEntries(CASES.map((c) => { const rs = runs.filter((r) => r.caseId === c.id); return [c.id, pct(pass(rs), rs.length)]; })),
    perStepAccuracy: (100 * perStepAccuracy(runs, CASES)).toFixed(1) + "%",
    checkerAccepts: pct(runs.filter((r) => verifyRun(byId[r.caseId], r).ok).length, runs.length),
  };
}

// Guarded agent over each case's constrained runs, each run used as the first attempt (same as guarded-agent.test.mjs).
const dist = { passed_first_try: 0, passed_after_retry: 0, fixed_by_fallback: 0, refused: 0 };
const perCase = {};
for (const c of CASES) {
  const pool = rec.constrained.filter((r) => r.caseId === c.id);
  perCase[c.id] = { ...dist, passed_first_try: 0, passed_after_retry: 0, fixed_by_fallback: 0, refused: 0 };
  for (let i = 0; i < pool.length; i++) {
    const res = await runGuarded(makeReplayChat([...pool.slice(i), ...pool.slice(0, i)]), c, { model: "replay" });
    dist[res.outcome] += 1;
    perCase[c.id][res.outcome] += 1;
  }
}
out.guarded = { total: rec.constrained.length, dist, perCase };
console.log(JSON.stringify(out, null, 2));
