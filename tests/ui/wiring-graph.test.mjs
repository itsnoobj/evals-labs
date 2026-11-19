// Run from repo root: node tests/ui/wiring-graph.test.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CASES, perfectRun } from "../../evals-lab/src/task/cases.js";
import { METRICS, scoreRun } from "../../evals-lab/src/evals/engine.js";
import { runGuarded } from "../../evals-lab/src/agent/guarded-agent.js";
import { wiringHtml, wiringStates, bindWiring, NODE_HELP, NODE_IDS } from "../../evals-lab/src/ui/wiring-graph.js";

let checks = 0;
const check = (fn) => { fn(); checks += 1; };
const c0 = CASES[0];
const good = perfectRun(c0);
const goodTexts = good.steps.map((s) => s.raw);

// Scripted chat: one list of raw texts per attempt. A call with 2 messages starts the next attempt.
function scripted(attemptTexts) {
  let attempt = -1;
  let i = 0;
  return async ({ messages }) => {
    if (messages.length === 2) { attempt += 1; i = 0; }
    const texts = attemptTexts[Math.min(attempt, attemptTexts.length - 1)];
    return { text: texts[Math.min(i++, texts.length - 1)], tokens: 10, ms: 100 };
  };
}
const wrongCategory = goodTexts.map((t, i) => {
  if (i !== 1) return t;
  const o = JSON.parse(t);
  return JSON.stringify({ ...o, args: { ...o.args, category: "online_shopping" } });
});

const LIVE_CAREFUL = ["ask", "guard", "model", "t1", "c1", "t2", "c2", "draft", "c3", "answer"];
const fromGuarded = (out, c = c0) => wiringStates("careful", {
  steps: out.run.steps, verdict: out.attempts.at(-1).verdict, attempts: out.attempts.length,
  outcome: out.outcome, scores: scoreRun(c, out.run),
});

// Careful perfect run: every live node passes or is done, gate passes.
const perfectOut = await runGuarded(scripted([goodTexts]), c0, { model: "fake" });
const perfectScores = scoreRun(c0, perfectOut.run);
const st = fromGuarded(perfectOut);
for (const id of ["t1", "c1", "t2", "c2", "draft", "c3"]) check(() => assert.equal(st[id], "pass", id));
for (const id of ["ask", "model", "answer", "dataset", "key", "prompt", "checks", "bar", "trace", "eval", "card"]) check(() => assert.equal(st[id], "done", id));
check(() => assert.equal(st.gate, "pass"));
for (const id of ["retry", "fallback", "refuse"]) check(() => assert.equal(st[id], "idle", id));
// The AI grader never runs here: NOT RUN, and it sits between the 8 checks and the scorecard.
check(() => assert.equal(st.judge, "notrun"));
check(() => assert.deepEqual(NODE_IDS.careful.slice(-5), ["trace", "eval", "judge", "card", "gate"]));

// Input guardrail node: sits between the question and the model.
check(() => assert.equal(st.guard, "pass"));
check(() => assert.deepEqual(NODE_IDS.careful.slice(5, 8), ["ask", "guard", "model"]));
check(() => assert.deepEqual(NODE_IDS.simple.slice(5, 8), ["ask", "guard", "model"]));
check(() => assert.ok(NODE_HELP.guard.includes("never reaches the model")));
{
  const idle = wiringStates("careful", {});
  check(() => assert.equal(idle.guard, "idle"));
  check(() => assert.equal(wiringStates("careful", { pending: true }).guard, "pass", "a started run passed the input check"));
  check(() => assert.equal(wiringStates("careful", { events: [{ t: "guard_in_ok" }] }).guard, "pass"));
  const idleHtml = wiringHtml({ kind: "careful", states: idle });
  check(() => assert.ok(/data-node="guard" data-state="idle"/.test(idleHtml)));
  check(() => assert.ok(idleHtml.includes("Input guardrail") && idleHtml.includes("before the model")));
}
// Blocked: BLOCKED word, a shape, every later live node idle (answer too), nothing is scored.
{
  const blockedCase = { ...c0, query: "What is the capital of France?" };
  const blockedOut = await runGuarded(scripted([goodTexts]), blockedCase, { model: "fake" });
  const bs = wiringStates("careful", { steps: blockedOut.run.steps, verdict: blockedOut.attempts.at(-1).verdict, attempts: blockedOut.attempts.length, outcome: blockedOut.outcome, events: blockedOut.events });
  check(() => assert.equal(blockedOut.outcome, "blocked"));
  check(() => assert.equal(bs.guard, "blocked"));
  check(() => assert.equal(bs.ask, "done"));
  for (const id of ["model", "t1", "c1", "t2", "c2", "draft", "c3", "answer", "retry", "fallback", "refuse", "trace", "eval", "card", "gate"]) check(() => assert.equal(bs[id], "idle", id));
  check(() => assert.equal(bs.judge, "notrun"));
  const bh = wiringHtml({ kind: "careful", states: bs, metrics: METRICS });
  check(() => assert.ok(/data-node="guard" data-state="blocked"[^>]*><i class="sq bad"[^>]*><\/i>[\s\S]*?<span class="wword">BLOCKED<\/span>/.test(bh), "BLOCKED word and square shape"));
  check(() => assert.ok(/data-node="answer" data-state="idle"/.test(bh)));
  // Events alone are enough to show BLOCKED (the app may pass them while the run is still pending).
  check(() => assert.equal(wiringStates("careful", { pending: true, events: [{ t: "guard_in_fail" }] }).guard, "blocked"));
  check(() => assert.equal(wiringStates("careful", { pending: true, events: [{ t: "guard_in_fail" }] }).model, "idle"));
}

// Wrong-category rank call on every attempt: c2 fails, retry used, then refuse.
const badOut = await runGuarded(scripted([wrongCategory]), c0, { model: "fake" });
const bad = fromGuarded(badOut);
check(() => assert.equal(bad.c2, "fail"));
check(() => assert.equal(bad.c1, "pass"));
check(() => assert.equal(bad.retry, "used"));
check(() => assert.equal(badOut.outcome, "refused"));
check(() => assert.equal(bad.refuse, "used"));
// A bad score sinks the gate.
const failScores = { ...perfectScores, task_success: { ...perfectScores.task_success, pass: false } };
check(() => assert.equal(wiringStates("careful", { steps: good.steps, scores: failScores }).gate, "fail"));
// A check that could not run (typed question, no answer key) gives 'notrun', not 'fail'. A real fail still wins.
const noKey = { ...perfectScores, task_success: { pass: null, score: null, reason: "no answer key for your own question" } };
check(() => assert.equal(wiringStates("careful", { steps: good.steps, scores: noKey }).gate, "notrun"));
check(() => assert.equal(wiringStates("careful", { steps: good.steps, scores: { ...noKey, grounded: { pass: false } } }).gate, "fail"));
// The AI grader alone does not decide the gate.
check(() => assert.equal(wiringStates("careful", { steps: good.steps, scores: { ...perfectScores, rubric_judge: { pass: false } } }).gate, "pass"));

// Live states while pending.
{
  const pend = (steps, extra = {}) => wiringStates("careful", { steps, pending: true, ...extra });
  const s0 = pend([]);
  check(() => assert.equal(s0.model, "active"));
  check(() => assert.equal(s0.t1, "idle"));
  const s1 = pend(good.steps.slice(0, 1));
  check(() => assert.equal(s1.t1, "pass"));
  check(() => assert.equal(s1.t2, "active"));
  check(() => assert.equal(s1.c1, "active"));
  check(() => assert.equal(s1.gate, "idle"));
  const s2 = pend(good.steps);
  check(() => assert.equal(s2.c3, "active"));
  check(() => assert.equal(s2.answer, "idle"));
  check(() => assert.equal(s2.trace, "idle"));
  const wrongTool = wiringStates("careful", { steps: [{ kind: "tool", tool: "rank_cards", args: {}, output: {} }], pending: true });
  check(() => assert.equal(wrongTool.t1, "fail"));
  const errored = wiringStates("careful", { steps: [{ kind: "tool", tool: "classify_merchant", args: {}, output: { error: "x" } }], pending: true });
  check(() => assert.equal(errored.t1, "fail"));
}

// Simple kind: no check or branch nodes, 5 + 4 MISSING boxes, tools still shown.
const simpleStates = wiringStates("simple", { steps: good.steps, scores: perfectScores });
for (const id of ["c1", "c2", "c3", "retry", "fallback", "refuse"]) check(() => assert.equal(id in simpleStates, false, id));
const simpleHtml = wiringHtml({ kind: "simple", states: simpleStates, metrics: METRICS, scores: perfectScores });
for (const id of ["c1", "c2", "c3", "retry", "fallback", "refuse"]) check(() => assert.equal(simpleHtml.includes(`data-node="${id}"`), false, id));
check(() => assert.equal((simpleHtml.match(/data-state="missing"/g) ?? []).length, 11)); // 10 before + the dashed Input guardrail box
check(() => assert.equal((simpleHtml.match(/<b class="wtext">none<\/b>/g) ?? []).length, 5));
check(() => assert.ok(/data-node="guard" data-state="missing"[^>]*>[\s\S]*?nothing here/.test(simpleHtml), "simple agent: dashed guard box"));
check(() => assert.equal(simpleStates.guard, "missing"));
check(() => assert.equal((simpleHtml.match(/nothing: you find out from users/g) ?? []).length, 4));
check(() => assert.ok(/data-node="judge" data-state="missing"[^>]*>[\s\S]*?nothing here/.test(simpleHtml)));
check(() => assert.equal(simpleHtml.includes("Safety net"), false));
for (const id of NODE_IDS.simple) check(() => assert.ok(simpleHtml.includes(`data-node="${id}"`), id));

// Careful html: every node id, no MISSING, 8 chips, safety net tag.
const html = wiringHtml({ kind: "careful", states: st, metrics: METRICS, scores: perfectScores });
for (const id of NODE_IDS.careful) check(() => assert.ok(html.includes(`<button type="button" class="wnode`) && html.includes(`data-node="${id}"`), id));
check(() => assert.equal(NODE_IDS.careful.length, 23)); // 22 before + guard
check(() => assert.deepEqual(Object.keys(NODE_HELP).sort(), [...NODE_IDS.careful].sort()));
check(() => assert.equal(html.includes('data-state="missing"'), false));
check(() => assert.equal((html.match(/class="wchip"/g) ?? []).length, 8));
check(() => assert.ok(html.includes("Safety net")));
check(() => assert.ok(html.includes('data-node="judge" data-state="notrun"') && html.includes("AI grader (second opinion)") && html.includes("LLM as judge") && html.includes(">NOT RUN</span>")));
check(() => assert.ok(NODE_HELP.judge.includes("0 to 5 grade, 5 times")));
check(() => assert.equal(wiringHtml({ kind: "careful", states: { ...st, judge: undefined } }).includes('data-node="judge" data-state="notrun"'), true));
check(() => assert.ok(/aria-pressed="false"/.test(html) && !/aria-pressed="true"/.test(html)));
for (const id of LIVE_CAREFUL) check(() => assert.ok(html.includes(`data-node="${id}" data-state="${st[id]}"`), id));
// Chips carry a word and a shape. rubric_judge has no score here, so it reads NOT RUN with a half square.
check(() => assert.ok(html.includes("NOT RUN") && html.includes('class="sq half"') && html.includes('class="sq ok"')));

// Selecting a node un-hides only its detail.
{
  const details = { t1: "<p>one</p>", c2: "<p>two</p>", gate: "<p>three</p>" };
  const h = wiringHtml({ kind: "careful", states: st, details, selected: "c2" });
  check(() => assert.equal((h.match(/class="wdetail"/g) ?? []).length, 3));
  check(() => assert.ok(h.includes('<div class="wdetail" data-for="c2"><p>two</p>')));
  check(() => assert.ok(h.includes('<div class="wdetail" data-for="t1" hidden><p>one</p>')));
  check(() => assert.ok(h.includes('<div class="wdetail" data-for="gate" hidden><p>three</p>')));
  check(() => assert.ok(h.includes('data-node="c2" data-state="pass" aria-pressed="true"')));
  const none = wiringHtml({ kind: "careful", details });
  check(() => assert.equal((none.match(/class="wdetail" data-for="\w+" hidden/g) ?? []).length, 3));
}

// Every state word shows up as text.
{
  const all = { ask: "idle", model: "active", t1: "pass", c1: "fail", t2: "used", c2: "skipped", draft: "done", judge: "notrun" };
  const h = wiringHtml({ kind: "careful", states: all });
  for (const word of ["IDLE", "RUNNING", "PASSED", "FAILED", "USED", "SKIPPED", "DONE", "NOT RUN"]) check(() => assert.ok(h.includes(`>${word}</span>`), word));
  check(() => assert.ok(simpleHtml.includes(">MISSING</span>")));
}
// A finished run that never called a tool shows SKIPPED.
check(() => assert.equal(wiringStates("simple", { steps: [good.steps.at(-1)] }).t1, "skipped"));

// Escaping: caller details are trusted as escaped, metric labels are escaped here.
{
  const h = wiringHtml({
    kind: "careful", details: { t1: "&lt;script&gt;alert(1)&lt;/script&gt;" }, selected: "t1",
    metrics: [{ id: "x", label: "<script>bad</script>" }],
  });
  check(() => assert.equal(h.includes("<script"), false));
  check(() => assert.ok(h.includes("&lt;script&gt;alert(1)")));
}

// bindWiring: click toggles detail and remembers the selection (minimal DOM stub).
{
  const mk = (extra) => ({ setAttribute(k, v) { this.attr = { ...this.attr, [k]: v }; }, ...extra });
  const t1 = mk({ dataset: { node: "t1" } });
  const c2 = mk({ dataset: { node: "c2" } });
  const dT1 = { dataset: { for: "t1" }, hidden: true };
  const dC2 = { dataset: { for: "c2" }, hidden: true };
  let handler;
  const root = {
    dataset: {},
    contains: () => true,
    addEventListener: (_, fn) => { handler = fn; },
    querySelectorAll: (sel) => (sel === "[data-node]" ? [t1, c2] : [dT1, dC2]),
  };
  bindWiring(root);
  bindWiring(root); // second call must not add a second listener
  const click = (btn) => handler({ target: { closest: () => btn } });
  click(t1);
  check(() => assert.deepEqual([root.dataset.sel, dT1.hidden, dC2.hidden, t1.attr["aria-pressed"]], ["t1", false, true, "true"]));
  click(c2);
  check(() => assert.deepEqual([root.dataset.sel, dT1.hidden, dC2.hidden, t1.attr["aria-pressed"]], ["c2", true, false, "false"]));
  click(c2);
  check(() => assert.deepEqual([root.dataset.sel, dC2.hidden, c2.attr["aria-pressed"]], ["", true, "false"]));
}

// CSS: square corners only, under 110 lines, container queries, reduced motion respected, prefix.
{
  const css = readFileSync(new URL("../../evals-lab/src/styles/wiring.css", import.meta.url), "utf8");
  const radii = [...css.matchAll(/border-radius\s*:\s*([^;}]+)/g)].map((m) => m[1].trim());
  check(() => assert.ok(radii.every((r) => /^0(px)?$/.test(r)), radii.join(",")));
  check(() => assert.ok(css.split("\n").length < 110));
  check(() => assert.ok(css.includes("prefers-reduced-motion") && css.includes("@container wire")));
  check(() => assert.ok(css.split("\n").filter((l) => /^[.@]/.test(l) && !l.startsWith(".wgraph") && !l.startsWith("@")).length === 0));
}

console.log(`${checks} checks passed`);
