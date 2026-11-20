import test from "node:test";
import assert from "node:assert/strict";
import { scoreResultHtml, scoreGridHtml, evalButtonLabel, evalWhyLine } from "../../evals-lab/src/ui/score-result.js";

const side = (passed, total, perCase) => ({ passed, total, rate: total ? passed / total : 0, perCase });
const tally = (runs) => ({ passed: runs.filter(Boolean).length, total: runs.length, runs });
const cases = [
  { id: "C01", merchant: "Amazon", amount: 15000 },
  { id: "C02", merchant: "Swiggy", amount: 800 },
];
const result = (over = {}) => ({
  simple: side(18, 30, { C01: tally([true, true, true, false, false]), C02: tally([true, true, true, true, true]) }),
  careful: side(30, 30, { C01: tally([true, true, true, true, true]), C02: tally([true, true, true, true, true]) }),
  aborted: false,
  planned: 60,
  ...over,
});
const text = (html) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

test("shows both agents with counts and rounded percent", () => {
  const t = text(scoreResultHtml(result(), "replay"));
  assert.match(t, /Agent without evals 18 of 30 60%/);
  assert.match(t, /Agent with evals 30 of 30 100%/);
});

test("rounds the rate, it does not truncate", () => {
  const r = result({ simple: side(2, 3, { C01: { passed: 2, total: 3 } }) });
  assert.match(text(scoreResultHtml(r, "replay")), /Agent without evals 2 of 3 67%/);
});

test("the better agent gets the word 'higher'; a tie marks neither", () => {
  const html = scoreResultHtml(result(), "replay");
  assert.equal(html.match(/>higher</g).length, 1);
  assert.match(html, /Agent with evals<\/span>.*?<b class="setscore-flag">higher<\/b>/);
  const tie = result({ simple: side(30, 30, {}), careful: side(30, 30, {}) });
  assert.ok(!scoreResultHtml(tie, "replay").includes("higher"));
});

test("grid shows one P or F square per run, with a row label and the rate at the end", () => {
  const html = scoreResultHtml(result(), "replay", { cases, runsPerCase: 5 });
  assert.equal(html.match(/class="sgrid-cell is-pass"/g).length, 3 + 5 + 5 + 5);
  assert.equal(html.match(/class="sgrid-cell is-fail"/g).length, 2);
  assert.match(html, /<span class="sgrid-cell is-pass" role="img" aria-label="Run 1: PASS">P<\/span>/);
  assert.match(html, /<span class="sgrid-cell is-fail" role="img" aria-label="Run 4: FAIL">F<\/span>/);
  const t = text(html);
  assert.match(t, /C01 Amazon \u20B915,000 P P P F F 3 of 5 \u00B7 60%/);
  assert.match(t, /C02 Swiggy \u20B9800 P P P P P 5 of 5 \u00B7 100%/);
  assert.match(t, /Agent without evals : 30 runs/);
});

test("preview grid: both agents, empty squares, planned run counts", () => {
  const html = scoreGridHtml({ cases, runsPerCase: 5 });
  const t = text(html);
  assert.match(t, /Agent without evals : 10 runs/);
  assert.match(t, /Agent with evals : 10 runs/);
  assert.equal(html.match(/class="sgrid-cell"/g).length, 2 * 2 * 5);
  assert.ok(!/is-pass|is-fail/.test(html));
  assert.match(t, /C01 Amazon \u20B915,000 5 runs/);
});

test("runs not reached after Stop stay empty squares, and the rate counts only finished runs", () => {
  const stopped = result({
    simple: side(2, 2, { C01: tally([true, true]), C02: tally([]) }),
    careful: side(1, 2, { C01: tally([true, false]), C02: tally([]) }),
    aborted: true,
  });
  const html = scoreResultHtml(stopped, "replay", { cases, runsPerCase: 5 });
  assert.equal(html.match(/class="sgrid-cell"/g).length, 2 * (3 + 5));
  assert.match(text(html), /C02 Swiggy \u20B9800 0 of 0 \u00B7 0%/);
});

test("button label and why line are built from the numbers, and stay short", () => {
  assert.equal(evalButtonLabel(6), "Run the eval: all 6 questions");
  const why = evalWhyLine(6, 5);
  assert.equal(why, "One run can be luck. Each agent answers all 6 questions 5 times. You get a pass rate.");
  assert.ok(why.split(/\s+/).length <= 18);
  assert.match(evalWhyLine(3, 7), /all 3 questions 7 times/);
});

test("mode line says Recorded runs or Live model", () => {
  assert.match(scoreResultHtml(result(), "replay"), /Recorded runs/);
  assert.match(scoreResultHtml(result(), "live"), /Live model/);
});

test("aborted result says stopped at N of M, a finished one does not", () => {
  const stopped = result({
    simple: side(2, 6, { C01: { passed: 2, total: 6 } }),
    careful: side(5, 6, { C01: { passed: 5, total: 6 } }),
    aborted: true,
  });
  const t = text(scoreResultHtml(stopped, "live"));
  assert.match(t, /Stopped at 12 of 60 runs/);
  assert.match(t, /Agent without evals 2 of 6 33%/);
  assert.ok(!/Stopped/.test(scoreResultHtml(result(), "replay")));
  const noPlan = scoreResultHtml({ ...stopped, planned: undefined }, "live");
  assert.match(text(noPlan), /Stopped at 12 runs/);
});

test("empty result shows 0 of 0 0% without NaN", () => {
  const empty = result({ simple: side(0, 0, {}), careful: side(0, 0, {}), aborted: true });
  const html = scoreResultHtml(empty, "replay");
  assert.match(text(html), /Agent without evals 0 of 0 0%/);
  assert.match(text(html), /Stopped at 0 of 60 runs/);
  assert.ok(!/NaN|undefined/.test(html));
});

test("case ids, merchants and run labels are escaped", () => {
  const evil = '<img src=x onerror="1">';
  const r = result({
    simple: side(0, 1, { [evil]: tally([false]) }),
    careful: side(1, 1, { [evil]: tally([true]) }),
  });
  const html = scoreResultHtml(r, "replay", { cases: [{ id: evil, merchant: "<b>x</b>", amount: 5 }], runsPerCase: 1 });
  assert.ok(!html.includes("<img"));
  assert.ok(!html.includes("<b>x"));
  assert.ok(html.includes("&lt;img src=x onerror=&quot;1&quot;&gt;"));
  assert.ok(html.includes("&lt;b&gt;x&lt;/b&gt; \u20B95"));
});
