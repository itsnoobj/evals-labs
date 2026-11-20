// Run from repo root: node tests/ui/wiring-graph.test.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { rememberOpen } from "../../evals-lab/src/ui/disclose.js";
import { CASES, perfectRun } from "../../evals-lab/src/task/cases.js";
import { METRICS, scoreRun } from "../../evals-lab/src/evals/engine.js";
import { runGuarded, verifyRun } from "../../evals-lab/src/agent/guarded-agent.js";
import {
  wiringHtml,
  wiringStates,
  bindWiring,
  setWiringSelected,
  countText,
  NODE_HELP,
  NODE_IDS,
} from "../../evals-lab/src/ui/wiring-graph.js";

let checks = 0;
const check = (fn) => {
  fn();
  checks += 1;
};
const c0 = CASES[0];
const good = perfectRun(c0);
const goodTexts = good.steps.map((s) => s.raw);

// Scripted chat: one list of raw texts per attempt. A call with 2 messages starts the next attempt.
function scripted(attemptTexts) {
  let attempt = -1;
  let i = 0;
  return async ({ messages }) => {
    if (messages.length === 2) {
      attempt += 1;
      i = 0;
    }
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
const fromGuarded = (out, c = c0) =>
  wiringStates("careful", {
    steps: out.run.steps,
    verdict: out.attempts.at(-1).verdict,
    attempts: out.attempts.length,
    outcome: out.outcome,
    scores: scoreRun(c, out.run),
  });

// Careful perfect run: every live node passes or is done, gate passes.
const perfectOut = await runGuarded(scripted([goodTexts]), c0, { model: "fake" });
const perfectScores = scoreRun(c0, perfectOut.run);
const st = fromGuarded(perfectOut);
for (const id of ["t1", "c1", "t2", "c2", "draft", "c3"]) check(() => assert.equal(st[id], "pass", id));
for (const id of ["ask", "model", "answer", "dataset", "key", "prompt", "checks", "bar", "trace", "eval", "card"])
  check(() => assert.equal(st[id], "done", id));
check(() => assert.equal(st.gate, "pass"));
for (const id of ["retry", "fallback", "refuse"]) check(() => assert.equal(st[id], "idle", id));
// Without a grade the LLM judge is NOT RUN, and it sits between the 8 checks and the scorecard.
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
  check(() =>
    assert.equal(wiringStates("careful", { pending: true }).guard, "pass", "a started run passed the input check"),
  );
  check(() => assert.equal(wiringStates("careful", { events: [{ t: "guard_in_ok" }] }).guard, "pass"));
  const idleHtml = wiringHtml({ kind: "careful", states: idle });
  check(() => assert.ok(/data-node="guard" data-state="idle"/.test(idleHtml)));
  check(() => assert.ok(idleHtml.includes("Input guardrail")));
  check(() => assert.ok(NODE_HELP.guard.includes("before the model does"), "the caption moved into the node help"));
}
// Blocked: BLOCKED word, a shape, every later live node idle (answer too), nothing is scored.
{
  const blockedCase = { ...c0, query: "What is the capital of France?" };
  const blockedOut = await runGuarded(scripted([goodTexts]), blockedCase, { model: "fake" });
  const bs = wiringStates("careful", {
    steps: blockedOut.run.steps,
    verdict: blockedOut.attempts.at(-1).verdict,
    attempts: blockedOut.attempts.length,
    outcome: blockedOut.outcome,
    events: blockedOut.events,
  });
  check(() => assert.equal(blockedOut.outcome, "blocked"));
  check(() => assert.equal(bs.guard, "blocked"));
  check(() => assert.equal(bs.ask, "done"));
  for (const id of [
    "model",
    "t1",
    "c1",
    "t2",
    "c2",
    "draft",
    "c3",
    "answer",
    "retry",
    "fallback",
    "refuse",
    "trace",
    "eval",
    "card",
    "gate",
  ])
    check(() => assert.equal(bs[id], "idle", id));
  check(() => assert.equal(bs.judge, "notrun"));
  const bh = wiringHtml({ kind: "careful", states: bs, metrics: METRICS });
  check(() =>
    assert.ok(
      /data-node="guard" data-state="blocked"[^>]*><i class="sq bad"[^>]*><\/i>[\s\S]*?<span class="wword">BLOCKED<\/span>/.test(
        bh,
      ),
      "BLOCKED word and square shape",
    ),
  );
  check(() => assert.ok(/data-node="answer" data-state="idle"/.test(bh)));
  // Events alone are enough to show BLOCKED (the app may pass them while the run is still pending).
  check(() =>
    assert.equal(wiringStates("careful", { pending: true, events: [{ t: "guard_in_fail" }] }).guard, "blocked"),
  );
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
const noKey = {
  ...perfectScores,
  task_success: { pass: null, score: null, reason: "no answer key for your own question" },
};
check(() => assert.equal(wiringStates("careful", { steps: good.steps, scores: noKey }).gate, "notrun"));
check(() =>
  assert.equal(
    wiringStates("careful", { steps: good.steps, scores: { ...noKey, grounded: { pass: false } } }).gate,
    "fail",
  ),
);
// The LLM judge alone does not decide the gate.
check(() =>
  assert.equal(
    wiringStates("careful", { steps: good.steps, scores: { ...perfectScores, rubric_judge: { pass: false } } }).gate,
    "pass",
  ),
);

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
  const wrongTool = wiringStates("careful", {
    steps: [{ kind: "tool", tool: "rank_cards", args: {}, output: {} }],
    pending: true,
  });
  check(() => assert.equal(wrongTool.t1, "fail"));
  const errored = wiringStates("careful", {
    steps: [{ kind: "tool", tool: "classify_merchant", args: {}, output: { error: "x" } }],
    pending: true,
  });
  check(() => assert.equal(errored.t1, "fail"));
}

// Simple kind: no check or branch nodes, 5 + 4 MISSING boxes, tools still shown.
const simpleStates = wiringStates("simple", { steps: good.steps, scores: perfectScores });
for (const id of ["c1", "c2", "c3", "retry", "fallback", "refuse"])
  check(() => assert.equal(id in simpleStates, false, id));
const simpleHtml = wiringHtml({ kind: "simple", states: simpleStates, metrics: METRICS, scores: perfectScores });
for (const id of ["c1", "c2", "c3", "retry", "fallback", "refuse"])
  check(() => assert.equal(simpleHtml.includes(`data-node="${id}"`), false, id));
check(() => assert.equal((simpleHtml.match(/data-state="missing"/g) ?? []).length, 11)); // 10 before + the dashed Input guardrail box
check(() => assert.equal((simpleHtml.match(/<b class="wtext">none<\/b>/g) ?? []).length, 5));
check(() =>
  assert.ok(
    /data-node="guard" data-state="missing"[^>]*>[\s\S]*?nothing here/.test(simpleHtml),
    "agent without evals: dashed guard box",
  ),
);
check(() => assert.equal(simpleStates.guard, "missing"));
check(() => assert.equal((simpleHtml.match(/nothing: you find out from users/g) ?? []).length, 4));
check(() => assert.ok(/data-node="judge" data-state="missing"[^>]*>[\s\S]*?nothing here/.test(simpleHtml)));
check(() => assert.equal(simpleHtml.includes("Safety net"), false));
for (const id of NODE_IDS.simple) check(() => assert.ok(simpleHtml.includes(`data-node="${id}"`), id));

// Careful html: every node id, no MISSING, 8 chips, safety net tag.
const html = wiringHtml({ kind: "careful", states: st, metrics: METRICS, scores: perfectScores });
for (const id of NODE_IDS.careful)
  check(() => assert.ok(html.includes(`<button type="button" class="wnode`) && html.includes(`data-node="${id}"`), id));
check(() => assert.equal(NODE_IDS.careful.length, 23)); // 22 before + guard
check(() => assert.deepEqual(Object.keys(NODE_HELP).sort(), [...NODE_IDS.careful].sort()));
check(() => assert.equal(html.includes('data-state="missing"'), false));
check(() => assert.equal((html.match(/class="wchip"/g) ?? []).length, 8));
check(() => assert.ok(html.includes("Safety net")));
check(() =>
  assert.ok(
    html.includes('data-node="judge" data-state="notrun"') &&
      html.includes("LLM judge (second opinion)") &&
      html.includes(">NOT RUN</span>"),
  ),
);
check(() => assert.ok(NODE_HELP.judge.includes("0 to 5 grade, 5 times")));
check(() => assert.ok(NODE_HELP.judge.includes("second AI"), "the caption moved into the node help"));
check(() => assert.ok(NODE_HELP.retry.includes("back to the Model"), "the retry note moved into the node help"));
check(() =>
  assert.equal(
    wiringHtml({ kind: "careful", states: { ...st, judge: undefined } }).includes(
      'data-node="judge" data-state="notrun"',
    ),
    true,
  ),
);
check(() => assert.ok(/aria-pressed="false"/.test(html) && !/aria-pressed="true"/.test(html)));
for (const id of LIVE_CAREFUL) check(() => assert.ok(html.includes(`data-node="${id}" data-state="${st[id]}"`), id));
// Chips carry a word and a shape. rubric_judge has no score here, so it reads NOT RUN with a half square.
check(() => assert.ok(html.includes("NOT RUN") && html.includes('class="sq half"') && html.includes('class="sq ok"')));

// The inline detail panel is gone (the explain dialog replaces it). `selected` only marks the open node.
{
  const h = wiringHtml({ kind: "careful", states: st, selected: "c2" });
  check(() => assert.equal(h.includes("wdetail"), false));
  check(() => assert.ok(h.includes('data-node="c2" data-state="pass" aria-pressed="true"')));
  check(() => assert.equal((h.match(/aria-pressed="true"/g) ?? []).length, 1));
}

// Every state word shows up as text.
{
  const all = {
    ask: "idle",
    model: "active",
    t1: "pass",
    c1: "fail",
    t2: "used",
    c2: "skipped",
    draft: "done",
    judge: "notrun",
  };
  const h = wiringHtml({ kind: "careful", states: all });
  for (const word of ["IDLE", "RUNNING", "PASSED", "FAILED", "USED", "SKIPPED", "DONE", "NOT RUN"])
    check(() => assert.ok(h.includes(`>${word}</span>`), word));
  check(() => assert.ok(simpleHtml.includes(">MISSING</span>")));
}
// A finished run that never called a tool shows SKIPPED.
check(() => assert.equal(wiringStates("simple", { steps: [good.steps.at(-1)] }).t1, "skipped"));

// Escaping: metric labels are escaped here.
{
  const h = wiringHtml({ kind: "careful", selected: "t1", metrics: [{ id: "x", label: "<script>bad</script>" }] });
  check(() => assert.equal(h.includes("<script"), false));
  check(() => assert.ok(h.includes("&lt;script&gt;bad")));
}

// bindWiring: a click marks the node, remembers it and calls onNode; the mark clears with setWiringSelected(root, "").
{
  const mk = (extra) => ({
    setAttribute(k, v) {
      this.attr = { ...this.attr, [k]: v };
    },
    ...extra,
  });
  const t1 = mk({ dataset: { node: "t1" } });
  const c2 = mk({ dataset: { node: "c2" } });
  let handler;
  let adds = 0;
  const root = {
    dataset: {},
    contains: () => true,
    addEventListener: (_, fn) => {
      handler = fn;
      adds += 1;
    },
    querySelectorAll: () => [t1, c2],
  };
  const opened = [];
  bindWiring(root, (id, btn) => opened.push([id, btn]));
  bindWiring(root, () => {}); // second call must not add a second listener
  check(() => assert.equal(adds, 1));
  const click = (btn) => handler({ target: { closest: () => btn } });
  click(t1);
  check(() =>
    assert.deepEqual([root.dataset.sel, t1.attr["aria-pressed"], c2.attr["aria-pressed"]], ["t1", "true", "false"]),
  );
  click(c2);
  check(() =>
    assert.deepEqual([root.dataset.sel, t1.attr["aria-pressed"], c2.attr["aria-pressed"]], ["c2", "false", "true"]),
  );
  check(() =>
    assert.deepEqual(opened, [
      ["t1", t1],
      ["c2", c2],
    ]),
  );
  setWiringSelected(root, "");
  check(() => assert.deepEqual([root.dataset.sel, c2.attr["aria-pressed"]], ["", "false"]));
}

// CSS: square corners only, container queries, reduced motion respected, prefix.
{
  const css = readFileSync(new URL("../../evals-lab/src/styles/wiring.css", import.meta.url), "utf8");
  const radii = [...css.matchAll(/border-radius\s*:\s*([^;}]+)/g)].map((m) => m[1].trim());
  check(() =>
    assert.ok(
      radii.every((r) => /^0(px)?$/.test(r)),
      radii.join(","),
    ),
  );
  check(() => assert.ok(css.includes("prefers-reduced-motion") && css.includes("@container wire")));
  check(() =>
    assert.ok(
      css.split("\n").filter((l) => /^[.@]/.test(l) && !l.startsWith(".wgraph") && !l.startsWith("@")).length === 0,
    ),
  );
}

// LLM judge node: RUNNING while asked, PASSED or FAILED from its own score, NOT RUN otherwise. The gate ignores it.
{
  const base = { steps: good.steps, verdict: verifyRun(c0, good), outcome: "passed_first_try" };
  const withJudge = (rubric_judge, judging) =>
    wiringStates("careful", { ...base, scores: { ...perfectScores, rubric_judge }, judging });
  check(() => assert.equal(withJudge({ pass: null }, true).judge, "active"));
  check(() => assert.equal(withJudge({ pass: true, score: 5 }, false).judge, "pass"));
  check(() => assert.equal(withJudge({ pass: false, score: 2 }, false).judge, "fail"));
  check(() => assert.equal(withJudge({ pass: null }, false).judge, "notrun"));
  check(() => assert.equal(wiringStates("careful", { ...base }).judge, "notrun"));
  check(() => assert.equal(withJudge({ pass: false, score: 2 }, false).gate, "pass")); // second opinion only
  // The state is a word and a shape, not a colour only.
  const htmlFor = (state) => wiringHtml({ kind: "careful", states: { judge: state } });
  for (const [state, word] of [
    ["active", "RUNNING"],
    ["pass", "PASSED"],
    ["fail", "FAILED"],
    ["notrun", "NOT RUN"],
  ])
    check(() =>
      assert.ok(
        new RegExp(`data-node="judge" data-state="${state}"[^>]*><i class="sq [a-z]+"[\\s\\S]*?>${word}</span>`).test(
          htmlFor(state),
        ),
        state,
      ),
    );
  check(() => assert.equal(wiringStates("simple", { steps: good.steps, judging: true }).judge, "missing"));
}

// Each phase is a click-to-open section: summary = phase name + a text count; "During the run" opens by default.
{
  const phases = (h) =>
    [
      ...h.matchAll(/<details class="disclose wlane (wl-\w+)" data-did="([^"]+)"( open)?><summary>([^<]*)<\/summary>/g),
    ].map((m) => ({ cls: m[1], id: m[2], open: !!m[3], summary: m[4] }));
  const done = wiringHtml({ kind: "careful", states: st, metrics: METRICS, scores: perfectScores });
  const p = phases(done);
  check(() =>
    assert.deepEqual(
      p.map((x) => x.cls),
      ["wl-build", "wl-live", "wl-after"],
    ),
  );
  check(() =>
    assert.deepEqual(
      p.map((x) => x.open),
      [false, true, false],
    ),
  );
  check(() =>
    assert.deepEqual(
      p.map((x) => x.summary),
      [
        "Before the run: build · 5 of 5 done",
        "During the run: live · 10 of 10 done",
        "After the run: measure · 4 of 5 done", // the LLM judge is NOT RUN
      ],
    ),
  );
  check(() =>
    assert.deepEqual(
      p.map((x) => x.id),
      ["wire-careful-build", "wire-careful-live", "wire-careful-after"],
    ),
  );
  // node ids and data- attributes stay inside the phases
  for (const id of NODE_IDS.careful) check(() => assert.ok(done.includes(`data-node="${id}"`), id));
  const idleP = phases(wiringHtml({ kind: "careful", states: {} }));
  check(() => assert.equal(idleP[1].summary, "During the run: live · 0 of 10 done"));
  const simpleP = phases(wiringHtml({ kind: "simple", states: simpleStates }));
  check(() =>
    assert.deepEqual(
      simpleP.map((x) => x.id),
      ["wire-simple-build", "wire-simple-live", "wire-simple-after"],
    ),
  );
  check(() => assert.match(simpleP[0].summary, /^Before the run: build · 0 of 5 done · 5 missing$/));
  check(() => assert.match(simpleP[1].summary, /^During the run: live · \d of 7 done( · \d (failed|missing))*/));
  // counts: a node that ran counts as done; failed and blocked ones are also named
  check(() =>
    assert.equal(
      countText([
        ["a", "A", "pass"],
        ["b", "B", "fail"],
        ["c", "C", "idle"],
      ]),
      "2 of 3 done · 1 failed",
    ),
  );
  check(() =>
    assert.equal(
      countText([
        ["a", "A", "blocked"],
        ["b", "B", "idle"],
      ]),
      "1 of 2 done · 1 blocked",
    ),
  );
  check(() =>
    assert.equal(
      countText([
        ["a", "A", "skipped"],
        ["b", "B", "active"],
      ]),
      "0 of 2 done",
    ),
  );
  // a phase the reader closed stays closed on the next draw, one the reader opened stays open
  rememberOpen("wire-careful-live", false);
  rememberOpen("wire-careful-build", true);
  const again = phases(wiringHtml({ kind: "careful", states: st, metrics: METRICS, scores: perfectScores }));
  check(() =>
    assert.deepEqual(
      again.map((x) => x.open),
      [true, false, false],
    ),
  );
  rememberOpen("wire-careful-live", true);
  rememberOpen("wire-careful-build", false);
  // the button look of every summary is plain CSS; check the words and sizes are there
  const dcss = readFileSync(new URL("../../evals-lab/src/styles/disclose.css", import.meta.url), "utf8");
  check(() => assert.match(dcss, /content: "SHOW"/));
  check(() => assert.match(dcss, /content: "HIDE"/));
  check(() => assert.match(dcss, /min-height: 44px/));
  check(() => assert.match(dcss, /border: 1px solid var\(--line\)/));
  check(() => assert.match(dcss, /summary:hover[\s\S]*summary:focus-visible/));
}

console.log(`${checks} checks passed`);
