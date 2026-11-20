import test from "node:test";
import assert from "node:assert/strict";
import { scoreResultHtml } from "../../evals-lab/src/ui/score-result.js";

const side = (passed, total, perCase) => ({ passed, total, rate: total ? passed / total : 0, perCase });
const result = (over = {}) => ({
  simple: side(18, 30, { C01: { passed: 3, total: 5 }, C02: { passed: 5, total: 5 } }),
  careful: side(30, 30, { C01: { passed: 5, total: 5 }, C02: { passed: 5, total: 5 } }),
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

test("per-case rows sit behind the Per question disclose", () => {
  const html = scoreResultHtml(result(), "replay");
  assert.match(html, /<details class="disclose" data-did="score-per-case"><summary>Per question<\/summary>/);
  assert.match(
    html,
    /<th scope="row" class="mono">C01<\/th><td class="mono">3 of 5<\/td><td class="mono">5 of 5<\/td>/,
  );
  assert.match(html, /C02<\/th><td class="mono">5 of 5<\/td><td class="mono">5 of 5<\/td>/);
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

test("case ids are escaped", () => {
  const evil = '<img src=x onerror="1">';
  const r = result({
    simple: side(0, 1, { [evil]: { passed: 0, total: 1 } }),
    careful: side(1, 1, { [evil]: { passed: 1, total: 1 } }),
  });
  const html = scoreResultHtml(r, "replay");
  assert.ok(!html.includes("<img"));
  assert.ok(html.includes("&lt;img src=x onerror=&quot;1&quot;&gt;"));
});
