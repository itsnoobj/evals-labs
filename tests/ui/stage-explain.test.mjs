// Run: node tests/ui/stage-explain.test.mjs
import assert from "node:assert/strict";
import { test } from "node:test";
import { stageExplain } from "../../evals-lab/src/ui/ui.js";
import { explainHtml } from "../../evals-lab/src/ui/explain-dialog.js";
import { STAGES, stageStates } from "../../evals-lab/src/ui/lessons.js";
import { METRICS, scoreRun } from "../../evals-lab/src/evals/engine.js";
import { CASES, CARDS, perfectRun } from "../../evals-lab/src/task/cases.js";

const c = CASES[0];
const run = perfectRun(c);
const scores = scoreRun(c, run);
const names = Object.fromEntries(Object.entries(CARDS).map(([id, x]) => [id, x.name]));
const ctx = { state: "ok", run, scores, metrics: METRICS, cardNames: names, query: c.query };
const stage = (id) => STAGES.find((s) => s.id === id);
const html = (id, extra = {}) =>
  explainHtml(stageExplain(stage(id), { ...ctx, state: stageStates(c, run, { scores })[id], ...extra }));

test("with no run (Start screen) every box says No run yet as text", () => {
  for (const st of STAGES) {
    const h = explainHtml(stageExplain(st, { metrics: METRICS }));
    assert.ok(h.includes("NO RUN YET"), st.id);
    assert.ok(h.includes("WHAT IT IS") && h.includes("WHY IT MATTERS") && h.includes("IN THIS RUN"), st.id);
    assert.ok(h.includes("<figcaption>"), `${st.id}: pictogram caption`);
  }
});

test("with a run every box shows a state word and its real value", () => {
  const states = stageStates(c, run, { scores });
  for (const st of STAGES) assert.ok(html(st.id).match(/xp-state">[A-Z ]+</), `${st.id}: state word`);
  assert.ok(html("question").includes(c.query.replace(/'/g, "&#39;")));
  assert.ok(html("classify").includes("&quot;merchant&quot;") && html("classify").includes("amazon"));
  assert.ok(html("rank").includes("HDFC Swiggy") && html("rank").includes("4 cards ranked"));
  assert.ok(html("answer").includes("₹750") && html("answer").includes("Reply:"));
  assert.ok(/\d+ PASS, \d+ FAIL, \d+ NOT RUN/.test(html("checks")));
  assert.equal(states.answer, "ok");
});

test("a bug box and a box that did not run are told in text", () => {
  assert.ok(html("classify", { bugStage: "classify" }).includes("BUG HERE"));
  const short = { ...run, steps: run.steps.slice(0, 1) };
  const h = explainHtml(stageExplain(stage("rank"), { ...ctx, run: short, state: stageStates(c, short)["rank"] }));
  assert.ok(h.includes("MISSING") && h.includes("without this step"));
});

test("the old text and the tools list are in closed sections", () => {
  const h = html("rank");
  assert.ok(h.includes("More about this box") && h.includes("Open-source tools") && h.includes("Concept."));
  assert.ok(!/<details[^>]* open/.test(h));
  assert.ok(h.includes('href="https://'));
});
