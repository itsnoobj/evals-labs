// Run: node --test tests/ui/compare-overview.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { LANES, overviewHtml, resultWord, nowStep } from "../../evals-lab/src/ui/compare-overview.js";
import { NODE_IDS } from "../../evals-lab/src/ui/wiring-graph.js";

const lane = (html, kind) => html.match(new RegExp(`<section class="ov-lane ov-${kind}"[\\s\\S]*?</section>`))[0];
const labels = (laneHtml) => [...laneHtml.matchAll(/<span class="ov-label">([^<]*)<\/span>/g)].map((m) => m[1]);

test("two lanes: 3 steps without evals, 5 steps with evals, in order", () => {
  const html = overviewHtml();
  assert.equal(html.match(/<section class="ov-lane /g).length, 2);
  assert.deepEqual(labels(lane(html, "simple")), ["Question", "Model", "Answer"]);
  assert.deepEqual(labels(lane(html, "careful")), ["Question", "Guardrail", "Model", "Checker", "Answer"]);
  assert.equal(lane(html, "simple").match(/<li class="ov-step/g).length, 3);
  assert.equal(lane(html, "careful").match(/<li class="ov-step/g).length, 5);
});

test("every label is at most two words and every step has a pictogram", () => {
  for (const { steps } of Object.values(LANES))
    for (const s of steps) assert.ok(s.label.split(" ").length <= 2, s.label);
  const html = overviewHtml();
  assert.equal(html.match(/<svg /g).length, 8);
});

test("each step is a button with a wiring node id that exists for that agent", () => {
  for (const [kind, { steps }] of Object.entries(LANES))
    for (const s of steps) assert.ok(NODE_IDS[kind].includes(s.id), `${kind} ${s.id}`);
  const html = overviewHtml();
  assert.equal(html.match(/<button type="button" class="ov-node"/g).length, 8);
  assert.ok(lane(html, "careful").includes('data-ov-kind="careful" data-ov-node="c3"'));
  assert.ok(lane(html, "simple").includes('data-ov-kind="simple" data-ov-node="model"'));
});

test("the branch label sits under the Checker only, as text", () => {
  const html = overviewHtml();
  assert.equal(html.match(/wrong\? retry, then fallback/g).length, 1);
  assert.ok(lane(html, "careful").includes('<span class="ov-branch">wrong? retry, then fallback</span>'));
  assert.ok(!lane(html, "simple").includes("ov-branch"));
});

test("before a run: no badge words, no NOW", () => {
  const html = overviewHtml();
  assert.ok(!/RIGHT|WRONG|BLOCKED|NOW/.test(html));
  assert.equal(html.match(/not run yet/g).length, 2);
});

test("badges are words, each with a square, in the lane they belong to", () => {
  const html = overviewHtml({ result: { simple: "WRONG", careful: "RIGHT" } });
  assert.match(
    lane(html, "simple"),
    /<b class="ov-badge is-wrong"><i class="sq bad" aria-hidden="true"><\/i>WRONG<\/b>/,
  );
  assert.match(
    lane(html, "careful"),
    /<b class="ov-badge is-right"><i class="sq ok" aria-hidden="true"><\/i>RIGHT<\/b>/,
  );
  const blocked = overviewHtml({ result: { simple: "NOT RUN", careful: "BLOCKED" } });
  assert.match(lane(blocked, "careful"), />BLOCKED<\/b>/);
  assert.ok(!/not run yet/.test(blocked));
});

test("NOW marks exactly the named step, as text", () => {
  const html = overviewHtml({ now: { careful: "c3" } });
  assert.equal(html.match(/>NOW</g).length, 1);
  assert.match(lane(html, "careful"), /class="ov-step is-now"[\s\S]*?Checker[\s\S]*?<b class="ov-now">NOW<\/b>/);
  assert.ok(!lane(html, "simple").includes("NOW"));
});

test("text is escaped", () => {
  const html = overviewHtml({ result: { simple: '<img src=x onerror="1">' } });
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
