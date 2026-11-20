import assert from "node:assert/strict";
import { checkExplain, checkWord } from "../../evals-lab/src/ui/check-details.js";
import { explainHtml } from "../../evals-lab/src/ui/explain-dialog.js";
import { METRICS, BUGS, judgePrompt, scoreRun } from "../../evals-lab/src/evals/engine.js";
import { CASES, perfectRun } from "../../evals-lab/src/task/cases.js";

const c = CASES[0];
const run = perfectRun(c);
const scores = scoreRun(c, run);
const m = (id) => METRICS.find((x) => x.id === id);
const page = (x) => explainHtml(x);
let n = 0;
const ok = (v, msg) => {
  assert.ok(v, msg);
  n++;
};

// Every check: PASS / FAIL / NOT RUN as text, plus the engine's own reason.
for (const metric of METRICS) {
  const x = checkExplain(metric, scores[metric.id]);
  const html = page(x);
  ok(x.title === metric.label, `${metric.id}: title`);
  ok(x.visualHtml.includes("<figcaption>"), `${metric.id}: pictogram with a caption`);
  ok(html.includes(checkWord(scores[metric.id])), `${metric.id}: state word in the run block`);
  const reason = scores[metric.id].reason;
  ok(
    scores[metric.id].pass == null || html.includes(reason.replace(/'/g, "&#39;")),
    `${metric.id}: engine reason shown`,
  );
  ok(/<details[^>]*class="[^"]*xp-sec/.test(html) && !/<details[^>]* open/.test(html), `${metric.id}: sections closed`);
  ok(html.includes("How it is checked"), `${metric.id}: how section`);
}

const code = page(checkExplain(m("grounded"), scores.grounded));
ok(code.includes("Plain code"), "code check says plain code");
ok(!code.includes("system prompt"), "code check has no prompt");
ok(
  code.includes("PASS") && code.includes("every number is in a tool output"),
  "perfect run passes with the engine reason",
);

const fail = scoreRun(c, { ...run, steps: run.steps.slice(0, 1) });
const f = page(checkExplain(m("task_success"), fail.task_success));
ok(f.includes("FAIL") && f.includes("no final answer"), "failed check shows FAIL and why");

// Not run: a typed question has no answer key
const typed = scoreRun({ ...c, expected: null, expectedTrajectory: null, custom: true }, run);
const nr = page(checkExplain(m("trajectory"), typed.trajectory));
ok(nr.includes("NOT RUN") && nr.includes("no answer key"), "NOT RUN as text with the engine reason");

// Run note and injected bug
const withCtx = page(
  checkExplain(m("ops"), scores.ops, { note: "Scoring a perfect scripted run of x.", bug: BUGS[0] }),
);
ok(
  withCtx.includes("Scoring a perfect scripted run of x.") &&
    withCtx.includes("BUG ON") &&
    withCtx.includes(BUGS[0].label),
  "note and bug lines",
);

// LLM judge
const prompt = judgePrompt(c, run);
const j = page(
  checkExplain(m("rubric_judge"), scores.rubric_judge, { grader: { prompt, grades: null, median: null } }),
);
ok(j.includes("You are a strict grader"), "shows the real system prompt");
ok(j.includes("Question: " + c.query.replace(/'/g, "&#39;")), "shows the user message with the question");
ok(j.includes("not asked yet") && j.includes("NOT RUN"), "no grades yet");
ok(j.includes("A second AI call"), "says it is a second AI call");
const judged = scoreRun(c, run, { judge: { score: 5 } });
judged.rubric_judge.reason = "five grades: 5, 5, 4, 5, 5";
const j2 = page(
  checkExplain(m("rubric_judge"), judged.rubric_judge, { grader: { prompt, grades: [5, 5, 4, 5, 5], median: 5 } }),
);
ok(j2.includes("5, 5, 4, 5, 5") && j2.includes("middle grade: 5") && j2.includes("PASS"), "shows grades");
ok(
  page(checkExplain(m("rubric_judge"), null, { grader: { prompt: { system: "<b>x</b>", user: "u" } } })).includes(
    "&lt;b&gt;x",
  ),
  "escapes html",
);
ok(!page(checkExplain(m("ops"), scores.ops)).includes("system prompt"), "only the judge has a prompt section");
ok(checkExplain(null) === null, "null metric gives null");
console.log(`${n} checks passed`);
