// Run: node --test tests/ui/example-chips.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CASES, MERCHANTS } from "../../evals-lab/src/task/cases.js";
import { scoreBoth, replayRunAgent } from "../../evals-lab/src/agent/score-both.js";
import {
  exampleChips,
  questionOptions,
  OPT_HELP,
  OPT_SAME,
  exampleChipsHtml,
  knownShops,
  GROUP_HELP,
  GROUP_FINE,
} from "../../evals-lab/src/ui/example-chips.js";

const recorded = JSON.parse(readFileSync(new URL("../../evals-lab/data/recorded-runs.json", import.meta.url), "utf8"));
const score = await scoreBoth({ cases: CASES, runsPerCase: 5, runAgent: replayRunAgent(recorded, { seedBase: 0 }) });
const gapOf = (id) => score.careful.perCase[id].passed - score.simple.perCase[id].passed;
const chips = await exampleChips(recorded, CASES);

test("help chips are the two biggest gaps, biggest first", () => {
  const help = chips.filter((c) => c.group === GROUP_HELP);
  assert.equal(help.length, 2);
  const sorted = CASES.map((c) => gapOf(c.id)).sort((a, b) => b - a);
  assert.deepEqual(
    help.map((c) => gapOf(c.id)),
    sorted.slice(0, 2),
  );
  assert.ok(gapOf(help[0].id) >= gapOf(help[1].id));
});

test("the fine chip is a case where both agents pass every run", () => {
  const fine = chips.filter((c) => c.group === GROUP_FINE);
  assert.equal(fine.length, 1);
  assert.equal(score.simple.perCase[fine[0].id].passed, 5);
  assert.equal(score.careful.perCase[fine[0].id].passed, 5);
});

test("captions carry the pass counts from scoreBoth and the reasons from the recorded runs", () => {
  for (const c of chips) {
    const s = score.simple.perCase[c.id];
    const w = score.careful.perCase[c.id];
    const nums = c.caption.match(/\d+/g).map(Number);
    // pass counts first, then only reasons that add up: wrong + silent = failures, retried <= passes
    assert.deepEqual([nums[0], nums[1]], [s.passed, s.total]);
    const failed = s.total - s.passed;
    const reasons = c.caption.match(/\((\d+ picked a wrong card)?(, )?(\d+ gave no answer)?\)/);
    if (failed)
      assert.equal(
        (reasons[0].match(/\d+/g) ?? []).map(Number).reduce((a, b) => a + b, 0),
        failed,
      );
    else assert.equal(reasons, null);
    assert.ok(c.caption.includes(`With evals ${w.passed} of ${w.total} right`));
  }
});

test("known values: C06 never answers without evals, C03 picks a wrong card, and both are fixed with evals", () => {
  const cap = (id) => chips.find((c) => c.id === id).caption;
  assert.equal(
    cap("C06"),
    "Recorded: without evals 0 of 5 right (5 gave no answer). With evals 5 of 5 right (3 needed a retry or the fallback).",
  );
  assert.equal(
    cap("C03"),
    "Recorded: without evals 1 of 5 right (4 picked a wrong card). With evals 5 of 5 right (3 needed a retry or the fallback).",
  );
});

test("labels are the shop and the amount from the case", () => {
  for (const c of chips) {
    const k = CASES.find((x) => x.id === c.id);
    assert.equal(c.label, `${k.merchant} ₹${k.amount.toLocaleString("en-IN")}`);
  }
});

test("no recorded runs: no chips. Missing runs for a case is an error, not a silent empty list", async () => {
  assert.deepEqual(await exampleChips(null, CASES), []);
  const bad = { ...recorded, free: [], constrained: [] };
  await assert.rejects(exampleChips(bad, CASES));
});

test("html: one row per group, one button per chip with its case id, text escaped", () => {
  const html = exampleChipsHtml(chips);
  for (const c of chips) assert.ok(html.includes(`data-example="${c.id}"`));
  assert.ok(html.includes(GROUP_HELP) && html.includes(GROUP_FINE));
  assert.ok(exampleChipsHtml([{ id: "X", label: "<b>", caption: "a&b", group: "g" }]).includes("&lt;b&gt;"));
  assert.ok(exampleChipsHtml(chips, { disabled: true }).includes(" disabled"));
});

test("knownShops lists every MERCHANTS key in the built-in spelling", () => {
  const shops = knownShops(MERCHANTS, CASES);
  assert.equal(shops.length, Object.keys(MERCHANTS).length);
  assert.ok(shops.includes("HP Petrol Pump") && shops.includes("BESCOM"));
});

test("dropdown: every case once, groups by gap, biggest gap first, numbers from scoreBoth", async () => {
  const groups = await questionOptions(recorded, CASES);
  const ids = groups.flatMap((g) => g.items.map((i) => i.id));
  assert.deepEqual([...ids].sort(), CASES.map((c) => c.id).sort());
  const gaps = ids.map(gapOf);
  assert.deepEqual(
    gaps,
    [...gaps].sort((a, b) => b - a),
  );
  for (const g of groups) {
    for (const i of g.items) {
      const s = score.simple.perCase[i.id];
      const w = score.careful.perCase[i.id];
      assert.ok(i.text.endsWith(`without evals ${s.passed}/${s.total}, with evals ${w.passed}/${w.total}`));
      if (g.group === OPT_HELP) assert.ok(gapOf(i.id) > 0);
      if (g.group === OPT_SAME) assert.equal(gapOf(i.id), 0);
    }
  }
  assert.equal(groups[0].group, OPT_HELP);
  assert.deepEqual(await questionOptions(null, CASES), []);
});
