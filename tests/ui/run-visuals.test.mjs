import assert from "node:assert/strict";
import { CARDS, CASES, perfectRun } from "../../evals-lab/src/task/cases.js";
import { rankBarsHtml, timelineHtml } from "../../evals-lab/src/ui/run-visuals.js";

let n = 0;
const check = (fn) => { fn(); n++; };
const count = (s, re) => (s.match(re) ?? []).length;
const names = Object.fromEntries(Object.entries(CARDS).map(([id, c]) => [id, c.name]));

const c01 = CASES[0];
const run = perfectRun(c01);
const ranked = run.steps[1].output;
const bars = rankBarsHtml(ranked, names);

check(() => assert.equal(count(bars, /class="rbars-row/g), 4));
check(() => assert.equal(count(bars, /BEST/g), 1));
check(() => assert.match(bars, /rbars-row rbars-best[\s\S]*?--w:100%/));
check(() => assert.match(bars, new RegExp(CARDS[ranked.ranked[0].card].name.replace(/[+]/g, "\\+"))));
check(() => assert.match(bars, /₹\d+(\.\d+)? · \d+(\.\d+)?%/));
check(() => assert.match(rankBarsHtml({ error: "bad <x>" }), /class="rbars-err">Tool error: bad &lt;x&gt;/));
check(() => assert.equal(rankBarsHtml({ category: "x" }), ""));
check(() => assert.equal(rankBarsHtml(null), ""));
const zero = { ranked: [{ card: "a", rate_pct: 0, reward_inr: 0 }, { card: "b", rate_pct: 0, reward_inr: 0 }] };
check(() => assert.match(rankBarsHtml(zero), /earns ₹0/));
check(() => assert.doesNotMatch(rankBarsHtml(zero), /rbars-bar/));
const tiny = { ranked: [{ card: "a", rate_pct: 5, reward_inr: 1000 }, { card: "b", rate_pct: 1, reward_inr: 1 }, { card: "c", rate_pct: 0, reward_inr: 0 }] };
check(() => assert.match(rankBarsHtml(tiny), /--w:2%[\s\S]*--w:0%/));
check(() => assert.match(rankBarsHtml({ ranked: [{ card: "x", rate_pct: 1, reward_inr: 5 }] }, { x: "<script>alert(1)</script>" }), /&lt;script&gt;/));
check(() => assert.doesNotMatch(rankBarsHtml({ ranked: [{ card: "<script>", rate_pct: 1, reward_inr: 5 }] }), /<script>/));

const tl = timelineHtml(run.steps);
check(() => assert.equal(count(tl, /class="tl-seg /g), 3));
check(() => assert.match(tl, /classify/));
check(() => assert.match(tl, /rank</));
check(() => assert.match(tl, /answer/));
check(() => assert.match(tl, /Total 2800 ms\. The slowest step: answer\./));
check(() => assert.match(tl, /800 ms/));
const bad = timelineHtml([{ kind: "tool", tool: "rank_cards", ms: 100 }, { kind: "invalid", ms: 50 }, { kind: "tool", tool: "mystery", ms: 1 }]);
check(() => assert.match(bad, /tl-invalid[\s\S]*invalid/));
check(() => assert.match(bad, /mystery/));
check(() => assert.match(bad, /--w:6%/));
check(() => assert.equal(timelineHtml([]), ""));

console.log(`${n} checks passed`);
