// Run: node --test tests/ui/step-bar.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { STEPS, stepState, stepBarHtml, resultWord, nowStep } from "../../evals-lab/src/ui/step-bar.js";
import { NODE_IDS } from "../../evals-lab/src/ui/wiring-graph.js";

const labels = (html) => [...html.matchAll(/<span class="sb-label">([^<]*)<\/span>/g)].map((m) => m[1]);
const stateWords = (html) =>
  [...html.matchAll(/<span class="sb-state"><i class="sq[^"]*" aria-hidden="true"><\/i>(?:<b>)?([^<]*)/g)].map(
    (m) => m[1],
  );

test("3 steps without evals, 5 steps with evals, in order", () => {
  const simple = stepBarHtml({ kind: "simple" });
  const careful = stepBarHtml({ kind: "careful" });
  assert.deepEqual(labels(simple), ["Question", "Model", "Answer"]);
  assert.deepEqual(labels(careful), ["Question", "Guardrail", "Model", "Checker", "Answer"]);
  assert.equal(simple.match(/<li class="sb-step/g).length, 3);
  assert.equal(careful.match(/<li class="sb-step/g).length, 5);
  assert.equal(careful.match(/class="sb-arrow"/g).length, 4);
});

test("every label is at most two words and every step has a pictogram", () => {
  for (const steps of Object.values(STEPS)) for (const s of steps) assert.ok(s.label.split(" ").length <= 2, s.label);
  assert.equal(stepBarHtml({ kind: "simple" }).match(/<svg /g).length, 3);
  assert.equal(stepBarHtml({ kind: "careful" }).match(/<svg /g).length, 5);
});

test("each step is a button with a wiring node id that exists for that agent", () => {
  for (const [kind, steps] of Object.entries(STEPS))
    for (const s of steps) assert.ok(NODE_IDS[kind].includes(s.id), `${kind} ${s.id}`);
  const html = stepBarHtml({ kind: "careful" });
  assert.equal(html.match(/<button type="button" class="sb-node"/g).length, 5);
  assert.ok(html.includes('data-sb-kind="careful" data-sb-node="c3"'));
  assert.ok(stepBarHtml({ kind: "simple" }).includes('data-sb-kind="simple" data-sb-node="model"'));
});

test("the branch label sits under the Checker only, as text", () => {
  const careful = stepBarHtml({ kind: "careful" });
  assert.equal(careful.match(/wrong\? retry, then fallback/g).length, 1);
  assert.match(
    careful,
    /Checker<\/span><\/button>[\s\S]*?<span class="sb-branch">wrong\? retry, then fallback<\/span>/,
  );
  assert.ok(!stepBarHtml({ kind: "simple" }).includes("sb-branch"));
});

test("before a run: every step says waiting, no badge, no NOW", () => {
  const html = stepBarHtml({ kind: "careful" });
  assert.deepEqual(stateWords(html), ["waiting", "waiting", "waiting", "waiting", "waiting"]);
  assert.ok(!/RIGHT|WRONG|BLOCKED|NOW/.test(html));
  assert.match(html, /Result: <span>not run yet<\/span>/);
  assert.match(stepBarHtml({ kind: "simple", running: true }), /Result: <span>running<\/span>/);
});

test("stepState: the six words, from the wiring states", () => {
  assert.equal(stepState("model", {}), "waiting");
  assert.equal(stepState("model", { states: { model: "active" } }), "NOW");
  assert.equal(stepState("ask", { states: { ask: "done" } }), "done");
  assert.equal(stepState("guard", { states: { guard: "pass" } }), "done");
  assert.equal(stepState("c3", { states: { c3: "fail" } }), "FAILED");
  assert.equal(stepState("c3", { states: { c3: "pass" } }), "done");
  assert.equal(stepState("model", { states: { model: "done" }, now: "model" }), "NOW");
  assert.equal(stepState("model", { skipped: true }), "skipped");
  assert.equal(stepState("t1", { states: { t1: "skipped" } }), "skipped");
});

test("blocked question: Guardrail says blocked, the later steps say skipped", () => {
  const states = { ask: "done", guard: "blocked", model: "idle", c3: "idle", answer: "idle" };
  const html = stepBarHtml({ kind: "careful", states, result: "BLOCKED" });
  assert.deepEqual(stateWords(html), ["done", "blocked", "skipped", "skipped", "skipped"]);
});

test("a run in progress shows NOW as text on exactly one step, and FAILED on the checker", () => {
  const states = { ask: "done", guard: "pass", model: "done", c3: "fail", answer: "idle" };
  const html = stepBarHtml({ kind: "careful", states, now: "model", retries: 1 });
  assert.deepEqual(stateWords(html), ["done", "done", "NOW", "FAILED", "waiting"]);
  assert.equal(html.match(/<b>NOW<\/b>/g).length, 1);
  assert.match(html, /class="sb-step is-now"/);
  assert.match(html, /class="sb-step is-failed"/);
});

test("retry label: shown on the Checker as text, only when a retry happened", () => {
  const states = { ask: "done", guard: "pass", model: "done", c3: "pass", answer: "done" };
  const html = stepBarHtml({ kind: "careful", states, retries: 1, result: "RIGHT" });
  assert.equal(html.match(/<span class="sb-note">retry 1<\/span>/g).length, 1);
  assert.match(html, /Checker<\/span><\/button>[\s\S]*?retry 1/);
  assert.ok(!stepBarHtml({ kind: "careful", states, retries: 0 }).includes("retry 1"));
  assert.ok(
    stepBarHtml({ kind: "careful", states, retries: 2, fallback: true }).includes(
      '<span class="sb-note">fallback</span>',
    ),
  );
  assert.ok(!stepBarHtml({ kind: "simple", states, retries: 1 }).includes("sb-note"));
});

test("badges are words, each with a square", () => {
  const wrong = stepBarHtml({ kind: "simple", result: "WRONG" });
  assert.match(wrong, /<b class="sb-badge is-wrong"><i class="sq bad" aria-hidden="true"><\/i>WRONG<\/b>/);
  const right = stepBarHtml({ kind: "careful", result: "RIGHT" });
  assert.match(right, /<b class="sb-badge is-right"><i class="sq ok" aria-hidden="true"><\/i>RIGHT<\/b>/);
  for (const word of ["BLOCKED", "NO ANSWER", "NO KEY", "NOT RUN"]) {
    const html = stepBarHtml({ kind: "careful", result: word });
    assert.match(html, new RegExp(`<i class="sq half" aria-hidden="true"></i>${word}</b>`));
    assert.ok(!html.includes("not run yet"));
  }
});

test("a skipped agent (typed question on recorded runs) says skipped on every step", () => {
  const html = stepBarHtml({ kind: "simple", skipped: true, result: "NOT RUN" });
  assert.deepEqual(stateWords(html), ["skipped", "skipped", "skipped"]);
});

test("text is escaped", () => {
  const html = stepBarHtml({ kind: "simple", result: '<img src=x onerror="1">' });
  assert.ok(!html.includes("<img"));
  assert.ok(html.includes("&lt;img"));
});

test("resultWord: from the real result of one side", () => {
  const ok = { scores: { task_success: { pass: true } } };
  const bad = { scores: { task_success: { pass: false } } };
  assert.equal(resultWord(ok), "RIGHT");
  assert.equal(resultWord(bad), "WRONG");
  assert.equal(resultWord({ ...ok, outcome: "blocked" }), "BLOCKED");
  assert.equal(resultWord({ scores: null, outcome: "blocked" }), "BLOCKED");
  assert.equal(resultWord({ ...bad, outcome: "refused" }), "NO ANSWER");
  assert.equal(resultWord({ scores: { task_success: { pass: null } } }), "NO KEY");
  assert.equal(resultWord({ note: "needs live", attempts: [] }), "NOT RUN");
  assert.equal(resultWord({ ...ok, pending: true }), null);
  assert.equal(resultWord({ pending: false }), null);
  assert.equal(resultWord(undefined), null);
});

test("nowStep: only while running; checker when a check is active, else model", () => {
  assert.equal(nowStep("careful", { model: "active" }, true), "model");
  assert.equal(nowStep("careful", { c1: "active" }, true), "c3");
  assert.equal(nowStep("careful", { c3: "active" }, true), "c3");
  assert.equal(nowStep("simple", { c3: "active" }, true), "model");
  assert.equal(nowStep("careful", { model: "active" }, false), null);
  assert.equal(nowStep("simple", {}, true), "model");
});
