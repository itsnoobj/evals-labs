import test from "node:test";
import assert from "node:assert/strict";
import {
  CARDS,
  CASES,
  CATEGORIES,
  MERCHANTS,
  RATE_SOURCES,
  classify_merchant,
  rank_cards,
  runTool,
  perfectRun,
} from "../../evals-lab/src/task/cases.js";

test("case ids are unique and every case has the full shape", () => {
  assert.equal(new Set(CASES.map((c) => c.id)).size, CASES.length);
  for (const c of CASES) {
    assert.match(c.id, /^C\d\d$/);
    assert.ok(c.query.length > 10, c.id);
    assert.ok(Number.isFinite(c.amount) && c.amount > 0, c.id);
    assert.ok(c.expected && c.expectedTrajectory, c.id);
    assert.deepEqual(Object.keys(c.expected).sort(), ["accept", "card", "category", "reward_inr"], c.id);
  }
});

test("the winning card is in the accept list, accept lists are sorted, and every accepted card exists", () => {
  for (const c of CASES) {
    assert.ok(c.expected.accept.includes(c.expected.card), `${c.id}: card not in accept`);
    assert.deepEqual(c.expected.accept, [...c.expected.accept].sort(), c.id);
    assert.equal(new Set(c.expected.accept).size, c.expected.accept.length, c.id);
    for (const id of c.expected.accept) assert.ok(Object.hasOwn(CARDS, id), `${c.id}: ${id}`);
  }
});

test("each case query states its own amount and merchant", () => {
  for (const c of CASES) {
    const digits = c.query.replace(/,/g, "");
    assert.ok(digits.includes(String(c.amount)), `${c.id}: amount ${c.amount} not in query`);
    assert.ok(c.query.toLowerCase().includes(c.merchant.toLowerCase()), `${c.id}: merchant ${c.merchant}`);
  }
});

test("the answer key is the tools' own output: accept = every card tied at the top reward", () => {
  for (const c of CASES) {
    const { category } = classify_merchant({ merchant: c.merchant });
    assert.equal(c.expected.category, category, c.id);
    const { ranked } = rank_cards({ amount: c.amount, category });
    const top = ranked[0].reward_inr;
    assert.equal(c.expected.reward_inr, top, c.id);
    assert.deepEqual(
      c.expected.accept,
      ranked
        .filter((r) => r.reward_inr === top)
        .map((r) => r.card)
        .sort(),
      c.id,
    );
    // the winner must beat every card outside accept
    for (const r of ranked.filter((r) => !c.expected.accept.includes(r.card))) assert.ok(r.reward_inr < top, c.id);
  }
});

test("expectedTrajectory is classify_merchant then rank_cards, with args matching the case", () => {
  for (const c of CASES) {
    assert.deepEqual(c.expectedTrajectory, [
      { tool: "classify_merchant", args: { merchant: c.merchant } },
      { tool: "rank_cards", args: { amount: c.amount, category: c.expected.category } },
    ]);
  }
});

test("card display names are unique and non-empty", () => {
  const names = Object.values(CARDS).map((c) => c.name);
  assert.ok(names.every((n) => typeof n === "string" && n.trim().length > 0));
  assert.equal(new Set(names.map((n) => n.toLowerCase())).size, names.length);
});

test("every rate is a finite non-negative number and every rate cell has a source with a valid confidence", () => {
  for (const [id, card] of Object.entries(CARDS)) {
    for (const cat of CATEGORIES) {
      const rate = card.rates[cat];
      assert.ok(Number.isFinite(rate) && rate >= 0 && rate <= 100, `${id}.${cat}: ${rate}`);
      const src = RATE_SOURCES[`${id}.${cat}`];
      assert.ok(src, `${id}.${cat}: no source`);
      assert.match(src.url, /^https:\/\/\S+$/);
      assert.ok(["high", "medium", "low"].includes(src.confidence), `${id}.${cat}`);
      assert.ok(src.note.trim().length > 0, `${id}.${cat}`);
    }
  }
  assert.equal(Object.keys(RATE_SOURCES).length, Object.keys(CARDS).length * CATEGORIES.length);
});

test("MERCHANTS keys are lower case so classify_merchant can match any case", () => {
  for (const key of Object.keys(MERCHANTS)) assert.equal(key, key.toLowerCase());
});

test("classify_merchant: edge inputs", () => {
  assert.deepEqual(classify_merchant({ merchant: "" }), { error: "unknown merchant: " });
  assert.deepEqual(classify_merchant({ merchant: "   " }), { error: "unknown merchant:    " });
  assert.deepEqual(classify_merchant({ merchant: "AMAZON" }), { category: "amazon" });
  assert.deepEqual(classify_merchant({ merchant: "\tSwiggy\n" }), { category: "swiggy" });
  assert.deepEqual(classify_merchant({ merchant: "बेस्कॉम" }), { error: "unknown merchant: बेस्कॉम" });
  assert.ok(classify_merchant({ merchant: null }).error);
  assert.ok(classify_merchant(undefined).error);
  assert.ok(classify_merchant({ merchant: "x".repeat(10000) }).error);
});

test("classify_merchant: inherited object keys are not merchants", () => {
  for (const name of ["constructor", "__proto__", "toString", "hasOwnProperty"]) {
    const out = classify_merchant({ merchant: name });
    assert.ok(out.error, `${name} -> ${String(out.category)}`);
    assert.equal(out.category, undefined, name);
  }
});

test("rank_cards: edge inputs", () => {
  assert.ok(rank_cards({ amount: 0, category: "amazon" }).error);
  assert.ok(rank_cards({ amount: NaN, category: "amazon" }).error);
  assert.ok(rank_cards({ amount: Infinity, category: "amazon" }).error);
  assert.ok(rank_cards({ amount: null, category: "amazon" }).error);
  assert.ok(rank_cards({ amount: 100 }).error);
  assert.ok(rank_cards({ amount: 100, category: "constructor" }).error);
  assert.ok(rank_cards().error);
  assert.deepEqual(rank_cards({ amount: 100, category: "AMAZON" }), { error: "unknown category: AMAZON" });
  // an amount that is too small to earn a paisa rounds to 0 but is still valid
  const tiny = rank_cards({ amount: 0.01, category: "amazon" });
  assert.equal(tiny.ranked.length, 4);
  assert.ok(tiny.ranked.every((r) => r.reward_inr === 0));
  // reward scales with amount: 10x amount gives 10x reward for a whole-number rate
  const one = rank_cards({ amount: 100, category: "swiggy" }).ranked[0];
  const ten = rank_cards({ amount: 1000, category: "swiggy" }).ranked[0];
  assert.equal(ten.card, one.card);
  assert.equal(ten.reward_inr, one.reward_inr * 10);
});

test("runTool: missing args and prototype names", () => {
  assert.ok(runTool("classify_merchant").error);
  assert.ok(runTool("rank_cards", null).error);
  assert.deepEqual(runTool("__proto__", {}), { error: "unknown tool: __proto__" });
  assert.deepEqual(runTool(undefined, {}), { error: "unknown tool: undefined" });
  assert.deepEqual(runTool("RANK_CARDS", { amount: 100, category: "amazon" }), { error: "unknown tool: RANK_CARDS" });
});

test("perfectRun: final step names the winner and every tool output equals the real tool output", () => {
  for (const c of CASES) {
    const run = perfectRun(c);
    assert.equal(run.steps.length, 3);
    const final = run.steps.at(-1);
    assert.equal(final.kind, "final");
    assert.equal(final.card, c.expected.card);
    assert.equal(final.reward_inr, c.expected.reward_inr);
    assert.ok(final.reply.includes(CARDS[c.expected.card].name), c.id);
    for (const s of run.steps.filter((s) => s.kind === "tool")) assert.deepEqual(s.output, runTool(s.tool, s.args));
    assert.equal(
      run.totalMs,
      run.steps.reduce((sum, s) => sum + s.ms, 0),
    );
    assert.equal(
      run.totalTokens,
      run.steps.reduce((sum, s) => sum + s.tokens, 0),
    );
  }
});
