// Run: node evals-lab/engine.test.mjs
import assert from "node:assert/strict";
import {
  CARDS, CATEGORIES, CATEGORY_LABELS, MERCHANTS, RATE_SOURCES, ASSUMPTIONS, CASES, classify_merchant, rank_cards, runTool, perfectRun,
} from "./cases.js";
import {
  METRICS, BUGS, scoreRun, injectBug, summarizeGrid, perStepAccuracy, stepCorrectness,
  chainSuccess, retryLift, judgePrompt, parseJudge,
} from "./engine.js";
import { makeCustomCase } from "./custom-question.js";

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log(`ok  ${name}`);
}

const DETERMINISTIC = METRICS.map((m) => m.id).filter((id) => id !== "rubric_judge");
const caseById = Object.fromEntries(CASES.map((c) => [c.id, c]));

// Hand-written so the test does not just echo the code under test.
// accept list, then reward. Rates from docs/answer-key-audit.md, computed by hand.
const EXPECTED_ANSWERS = {
  C01: [["hdfc_swiggy", "icici_amazon_pay"], 750], // 5% tie on Amazon
  C02: [["hdfc_swiggy"], 80],
  C03: [["hdfc_swiggy"], 400],
  C04: [["idfc_first_power_plus"], 100],
  C05: [["idfc_first_power_plus"], 90],
  C06: [["idfc_first_power_plus"], 25],
};

// Copied from docs/specs/engine-contract.md "Bug table".
const BUG_TABLE = {
  wrong_number_in_reply: { fails: ["task_success", "grounded"], passes: ["trajectory", "answer_match", "tool_recall", "tool_precision", "ops"] },
  skip_tool: { fails: ["trajectory", "tool_recall"], passes: ["task_success", "answer_match", "grounded", "tool_precision", "ops"] },
  duplicate_call: { fails: ["trajectory", "tool_precision"], passes: ["task_success", "answer_match", "grounded", "tool_recall", "ops"] },
  invented_tool: { fails: ["trajectory", "tool_precision"], passes: ["task_success", "answer_match", "grounded", "tool_recall", "ops"] },
  right_words_wrong_card: { fails: ["task_success"], passes: ["trajectory", "answer_match", "grounded", "tool_recall", "tool_precision", "ops"] },
};

check("4 cards, each rating every category", () => {
  assert.equal(Object.keys(CARDS).length, 4);
  for (const card of Object.values(CARDS)) {
    assert.deepEqual(Object.keys(card.rates).sort(), [...CATEGORIES].sort());
  }
});

check("category ids, labels and merchants line up", () => {
  assert.deepEqual(CATEGORIES, ["amazon", "online_shopping", "swiggy", "fuel_hpcl", "utilities", "telecom"]);
  assert.deepEqual(Object.keys(CATEGORY_LABELS).sort(), [...CATEGORIES].sort());
  assert.equal(CATEGORY_LABELS.amazon, "Amazon.in");
  assert.deepEqual(Object.keys(MERCHANTS).sort(), ["airtel", "amazon", "bescom", "flipkart", "hp petrol pump", "swiggy"]);
  for (const cat of Object.values(MERCHANTS)) assert.ok(CATEGORIES.includes(cat), cat);
});

check("every rate cell has a source note; the unverified cells are marked low", () => {
  const cells = Object.entries(CARDS).flatMap(([id, card]) => CATEGORIES.map((cat) => `${id}.${cat}`));
  assert.deepEqual(Object.keys(RATE_SOURCES).sort(), cells.sort());
  for (const [key, src] of Object.entries(RATE_SOURCES)) {
    assert.match(src.url, /^https:\/\//, key);
    assert.ok(["high", "medium", "low"].includes(src.confidence), key);
    assert.ok(src.note.length > 10, key);
  }
  const low = Object.entries(RATE_SOURCES).filter(([, s]) => s.confidence === "low").map(([k]) => k).sort();
  assert.deepEqual(low, ["hdfc_swiggy.telecom", "hdfc_swiggy.utilities"]);
  for (const k of low) assert.match(RATE_SOURCES[k].note, /Cannot change the winner of any case/);
  assert.ok(ASSUMPTIONS.length >= 5 && ASSUMPTIONS.every((a) => typeof a === "string" && a.endsWith(".")));
  assert.ok(ASSUMPTIONS.some((a) => a.includes("Prime")) && ASSUMPTIONS.some((a) => a.includes("first of the month")));
});

check("low-confidence cells cannot change any winner (set to 0% or 1%, accept lists stay the same)", () => {
  const low = Object.entries(RATE_SOURCES).filter(([, src]) => src.confidence === "low").map(([k]) => k.split("."));
  assert.equal(low.length, 2);
  for (const rate of [0, 1]) {
    const saved = low.map(([card, cat]) => CARDS[card].rates[cat]);
    low.forEach(([card, cat]) => { CARDS[card].rates[cat] = rate; });
    try {
      for (const c of CASES) {
        const { ranked } = rank_cards({ amount: c.amount, category: c.expected.category });
        const accept = ranked.filter((r) => r.reward_inr === ranked[0].reward_inr).map((r) => r.card).sort();
        assert.deepEqual(accept, c.expected.accept, `${c.id} at ${rate}%`);
      }
    } finally {
      low.forEach(([card, cat], i) => { CARDS[card].rates[cat] = saved[i]; });
    }
  }
});

check("6 cases with unique ids C01..C06", () => {
  assert.equal(CASES.length, 6);
  assert.deepEqual(CASES.map((c) => c.id), ["C01", "C02", "C03", "C04", "C05", "C06"]);
});

check("cases match hand-computed accept list and reward", () => {
  for (const c of CASES) {
    const [accept, reward] = EXPECTED_ANSWERS[c.id];
    assert.deepEqual(c.expected.accept, accept, c.id);
    assert.equal(c.expected.reward_inr, reward, c.id);
    assert.equal(c.expected.card, accept[0], `${c.id}: card is the first accepted id`);
  }
});

check("C01 is a tie; the others have one winner; C05 carries the IDFC cap note", () => {
  assert.equal(caseById.C01.expected.accept.length, 2);
  for (const id of ["C02", "C03", "C04", "C05", "C06"]) assert.equal(caseById[id].expected.accept.length, 1, id);
  assert.match(caseById.C05.note, /Rs 2,000/);
});

check("classify_merchant: known, case and space tolerant, unknown", () => {
  assert.deepEqual(classify_merchant({ merchant: "Amazon" }), { category: "amazon" });
  assert.deepEqual(classify_merchant({ merchant: "Flipkart" }), { category: "online_shopping" });
  assert.deepEqual(classify_merchant({ merchant: "  hp PETROL pump " }), { category: "fuel_hpcl" });
  assert.deepEqual(classify_merchant({ merchant: "DMart" }), { error: "unknown merchant: DMart" });
  assert.deepEqual(classify_merchant({ merchant: "Nowhere Store" }), { error: "unknown merchant: Nowhere Store" });
  assert.ok(classify_merchant({}).error);
});

check("rank_cards: sorted desc, exact rewards, tie broken by card id", () => {
  const { ranked } = rank_cards({ amount: 15000, category: "amazon" });
  assert.deepEqual(ranked, [
    { card: "hdfc_swiggy", rate_pct: 5, reward_inr: 750 },
    { card: "icici_amazon_pay", rate_pct: 5, reward_inr: 750 },
    { card: "hdfc_infinia", rate_pct: 3.33, reward_inr: 499.5 },
    { card: "idfc_first_power_plus", rate_pct: 0.5, reward_inr: 75 },
  ].sort((a, b) => b.reward_inr - a.reward_inr || (a.card < b.card ? -1 : 1)));
  assert.equal(ranked.length, 4);
  for (let i = 1; i < ranked.length; i++) assert.ok(ranked[i - 1].reward_inr >= ranked[i].reward_inr);
});

check("rank_cards: fuel_hpcl is 5% on IDFC and 0% on the rest", () => {
  const { ranked } = rank_cards({ amount: 2000, category: "fuel_hpcl" });
  assert.deepEqual(ranked.map((r) => r.reward_inr), [100, 0, 0, 0]);
  assert.equal(ranked[0].card, "idfc_first_power_plus");
});

check("rank_cards: decimal rates round to paise", () => {
  const { ranked } = rank_cards({ amount: 800, category: "swiggy" });
  assert.deepEqual(ranked.map((r) => [r.card, r.reward_inr]), [["hdfc_swiggy", 80], ["hdfc_infinia", 26.64], ["icici_amazon_pay", 8], ["idfc_first_power_plus", 4]]);
});

check("rank_cards: error outputs", () => {
  assert.deepEqual(rank_cards({ amount: 100, category: "pets" }), { error: "unknown category: pets" });
  assert.deepEqual(rank_cards({ amount: 100, category: "fuel" }), { error: "unknown category: fuel" }); // old id is gone
  assert.ok(rank_cards({ amount: -5, category: "telecom" }).error);
  assert.ok(rank_cards({ amount: "abc", category: "telecom" }).error);
  assert.deepEqual(rank_cards({ amount: "1000", category: "utilities" }).ranked[0].reward_inr, 50);
});

check("runTool: dispatches and rejects unknown tools", () => {
  assert.deepEqual(runTool("classify_merchant", { merchant: "Airtel" }), { category: "telecom" });
  assert.deepEqual(runTool("check_credit_limit", {}), { error: "unknown tool: check_credit_limit" });
  assert.deepEqual(runTool("toString", {}), { error: "unknown tool: toString" });
});

check("METRICS has 8 items in contract order and groups", () => {
  assert.deepEqual(METRICS.map((m) => m.id), ["trajectory", "task_success", "answer_match", "grounded", "tool_recall", "tool_precision", "rubric_judge", "ops"]);
  assert.deepEqual(METRICS.map((m) => m.group), ["TOOL CHOICE", "RESULT", "REPLY TEXT", "NO MADE-UP NUMBERS", "TOOL CHOICE", "TOOL CHOICE", "SECOND OPINION", "SPEED"]);
});

check("perfectRun passes all 7 deterministic metrics on every case", () => {
  for (const c of CASES) {
    const run = perfectRun(c);
    assert.equal(run.caseId, c.id);
    const scores = scoreRun(c, run);
    for (const id of DETERMINISTIC) assert.equal(scores[id].pass, true, `${c.id} ${id}: ${scores[id].reason}`);
    assert.deepEqual(scores.rubric_judge, { pass: null, score: null, reason: "not run" });
  }
});

check("perfectRun is deterministic", () => {
  assert.deepEqual(perfectRun(CASES[0]), perfectRun(CASES[0]));
  assert.equal(perfectRun(CASES[0]).totalMs, 2800);
});

check("rubric_judge: score 5 passes, score 2 fails", () => {
  const c = CASES[0];
  const run = perfectRun(c);
  assert.equal(scoreRun(c, run, { judge: { score: 5 } }).rubric_judge.pass, true);
  assert.equal(scoreRun(c, run, { judge: { score: 4 } }).rubric_judge.pass, true);
  assert.equal(scoreRun(c, run, { judge: { score: 2 } }).rubric_judge.pass, false);
  assert.equal(scoreRun(c, run, { judge: { score: 2 } }).rubric_judge.score, 2);
});

check("bug table: all 5 bugs x 6 cases fail and pass exactly the listed metrics", () => {
  assert.deepEqual(BUGS.map((b) => b.id), Object.keys(BUG_TABLE));
  for (const [bugId, row] of Object.entries(BUG_TABLE)) {
    for (const c of CASES) {
      const scores = scoreRun(c, injectBug(c, perfectRun(c), bugId));
      for (const id of row.fails) assert.equal(scores[id].pass, false, `${bugId} ${c.id} should fail ${id}`);
      for (const id of row.passes) assert.equal(scores[id].pass, true, `${bugId} ${c.id} should pass ${id}: ${scores[id].reason}`);
      assert.equal(row.fails.length + row.passes.length, DETERMINISTIC.length);
    }
  }
});

check("injectBug marks the model and does not mutate its input", () => {
  for (const bugId of Object.keys(BUG_TABLE)) {
    const c = CASES[3];
    const run = perfectRun(c);
    const snapshot = JSON.stringify(run);
    const bugged = injectBug(c, run, bugId);
    assert.equal(JSON.stringify(run), snapshot, bugId);
    assert.equal(bugged.model, `injected:${bugId}`);
    assert.notEqual(bugged, run);
  }
  assert.throws(() => injectBug(CASES[0], perfectRun(CASES[0]), "nope"));
});

check("injectBug: concrete shapes", () => {
  const c = caseById.C01;
  const wrong = injectBug(c, perfectRun(c), "wrong_number_in_reply").steps.at(-1);
  assert.equal(wrong.reward_inr, 7500);
  assert.ok(wrong.reply.includes("7500") && wrong.reply.includes("15000"));
  // C02: 10x of Rs 80 is Rs 800, which is the question's own amount and would look grounded, so the bug uses 100x.
  const wrong02 = injectBug(caseById.C02, perfectRun(caseById.C02), "wrong_number_in_reply").steps.at(-1);
  assert.equal(wrong02.reward_inr, 8000);
  assert.equal(injectBug(c, perfectRun(c), "skip_tool").steps.length, 2);
  assert.equal(injectBug(c, perfectRun(c), "duplicate_call").steps.length, 4);
  const invented = injectBug(c, perfectRun(c), "invented_tool");
  assert.equal(invented.steps[2].tool, "check_credit_limit");
  assert.ok(invented.steps[2].output.error);
  assert.equal(invented.totalMs, 3100);
});

check("ties: either accepted card passes task_success and answer_match; a non-accepted card fails", () => {
  const c = caseById.C01;
  const [a, b] = c.expected.accept;
  for (const id of [a, b]) {
    const run = perfectRun(c);
    const final = run.steps.at(-1);
    final.card = id;
    final.reply = `Use ${CARDS[id].name} for Amazon. You earn ₹750 on ₹15000.`;
    const s = scoreRun(c, run);
    assert.equal(s.task_success.pass, true, id);
    assert.equal(s.answer_match.pass, true, id);
    assert.ok(stepCorrectness(c, run).at(-1), id);
  }
  const bad = perfectRun(c);
  bad.steps.at(-1).card = "hdfc_infinia";
  bad.steps.at(-1).reply = "Use HDFC Infinia for Amazon. You earn ₹750 on ₹15000.";
  const s = scoreRun(c, bad);
  assert.equal(s.task_success.pass, false);
  assert.equal(s.answer_match.pass, false);
  assert.equal(stepCorrectness(c, bad).at(-1), false);
});

check("ties: right reward but a card outside accept fails; right card with a wrong reward fails", () => {
  const c = caseById.C01;
  const wrongCard = perfectRun(c);
  wrongCard.steps.at(-1).card = "idfc_first_power_plus";
  assert.equal(scoreRun(c, wrongCard).task_success.pass, false);
  const wrongReward = perfectRun(c);
  wrongReward.steps.at(-1).reward_inr = 700;
  assert.equal(scoreRun(c, wrongReward).task_success.pass, false);
  const near = perfectRun(c);
  near.steps.at(-1).reward_inr = 750.4;
  assert.equal(scoreRun(c, near).task_success.pass, true);
});

check("ties: reasons list every accepted card as 'A or B'", () => {
  const c = caseById.C01;
  const run = perfectRun(c);
  run.steps.at(-1).card = "hdfc_infinia";
  run.steps.at(-1).reply = "Use HDFC Infinia.";
  const s = scoreRun(c, run);
  assert.match(s.task_success.reason, /got hdfc_infinia .*accepted: hdfc_swiggy or icici_amazon_pay/);
  assert.match(s.answer_match.reason, /accepted: HDFC Swiggy or ICICI Amazon Pay/);
});

check("right_words_wrong_card picks a card outside accept on every case, so the tie cannot pass by accident", () => {
  for (const c of CASES) {
    const bugged = injectBug(c, perfectRun(c), "right_words_wrong_card").steps.at(-1);
    assert.ok(!c.expected.accept.includes(bugged.card), `${c.id}: ${bugged.card}`);
    assert.ok(bugged.card in CARDS);
  }
});

check("a case with only expected.card (old shape) still scores", () => {
  const c = structuredClone(caseById.C02);
  delete c.expected.accept;
  const s = scoreRun(c, perfectRun(c));
  assert.equal(s.task_success.pass, true);
  assert.equal(s.answer_match.pass, true);
});

check("summarizeGrid on a known grid", () => {
  const s = summarizeGrid([
    { caseId: "C01", runs: [true, true, true, true, true] },
    { caseId: "C02", runs: [true, false, false, false, false] },
    { caseId: "C03", runs: [false, false, false, false, false] },
    { caseId: "C04", runs: [true, true, false, true, false] },
  ]);
  assert.deepEqual(s, { nCases: 4, nRuns: 20, avg: 9 / 20, allPass: 1, anyPass: 3 });
  assert.deepEqual(summarizeGrid([]), { nCases: 0, nRuns: 0, avg: 0, allPass: 0, anyPass: 0 });
});

check("perStepAccuracy: perfect runs = 1, mixed set = hand-computed 7/10", () => {
  assert.equal(perStepAccuracy(CASES.map(perfectRun), CASES), 1);
  const runs = [
    perfectRun(caseById.C01), // 3 correct of 3
    injectBug(caseById.C02, perfectRun(caseById.C02), "skip_tool"), // rank step shifts to slot 0 (wrong), final right: 1 of 3
    injectBug(caseById.C03, perfectRun(caseById.C03), "duplicate_call"), // extra rank step wrong: 3 of 4
  ];
  assert.equal(perStepAccuracy(runs, CASES), 7 / 10);
  assert.equal(perStepAccuracy([], CASES), 0);
});

check("stepCorrectness: perfect run all true, skipped step shifts the rest", () => {
  const c = caseById.C01;
  assert.deepEqual(stepCorrectness(c, perfectRun(c)), [true, true, true]);
  assert.deepEqual(stepCorrectness(c, injectBug(c, perfectRun(c), "skip_tool")), [false, true]);
});

check("chainSuccess and retryLift", () => {
  assert.ok(Math.abs(chainSuccess(0.9, 3) - 0.729) < 1e-9);
  assert.equal(retryLift(0.5, 2), 0.75);
});

check("parseJudge", () => {
  assert.deepEqual(parseJudge("Score: 4"), { score: 4 });
  assert.deepEqual(parseJudge("no idea"), { score: null });
  assert.deepEqual(parseJudge("I would say 3 out of 5"), { score: 3 });
  assert.deepEqual(parseJudge("15 points"), { score: null });
  assert.deepEqual(parseJudge("7"), { score: null });
  assert.deepEqual(parseJudge(undefined), { score: null });
});

check("judgePrompt asks for 0-5, carries query and reply, hides the expected answer", () => {
  const c = caseById.C01;
  const { system, user } = judgePrompt(c, perfectRun(c));
  for (const word of ["relevance", "groundedness", "clarity", "0", "5", "integer"]) assert.ok(system.includes(word), word);
  assert.ok(user.includes(c.query));
  assert.ok(user.includes(`Use ${CARDS[c.expected.card].name}`));
  assert.ok(!user.includes("expected"));
});

check("ops fails on an invalid-json step", () => {
  const c = CASES[0];
  const run = perfectRun(c);
  run.steps.splice(1, 0, { kind: "invalid", raw: "{oops", ms: 500, tokens: 20, validJson: false });
  const ops = scoreRun(c, run).ops;
  assert.equal(ops.pass, false);
  assert.ok(ops.reason.includes("unreadable reply"));
});

check("ops fails when slower than 20 s, reason shows ms and tokens", () => {
  const c = CASES[0];
  const run = perfectRun(c);
  run.totalMs = 20001;
  const ops = scoreRun(c, run).ops;
  assert.equal(ops.pass, false);
  assert.ok(ops.reason.includes("20001 ms") && ops.reason.includes("170 text pieces"));
});

check("a run with no final answer fails the answer metrics without throwing", () => {
  const c = CASES[0];
  const run = perfectRun(c);
  run.steps.pop();
  const scores = scoreRun(c, run);
  for (const id of ["task_success", "answer_match", "grounded"]) assert.equal(scores[id].pass, false, id);
});

check("answer_match treats 'Power Plus' and 'Power+' as the same card, and still rejects a wrong card", () => {
  const c = caseById.C06;
  const withReply = (reply) => { const run = perfectRun(c); run.steps.at(-1).reply = reply; return scoreRun(c, run).answer_match.pass; };
  assert.equal(withReply("The best credit card for an Airtel phone bill is the IDFC First Power Plus card."), true);
  assert.equal(withReply("Use IDFC First Power+ for Airtel."), true);
  assert.equal(withReply("Use idfc_first_power_plus."), true);
  assert.equal(withReply("Use HDFC Infinia."), false);
  assert.equal(withReply("Use IDFC First Power."), false);
});

// A question the user typed has no answer key.
const KEY_CHECKS = ["trajectory", "task_success", "answer_match", "tool_recall", "tool_precision"];
const customCase = () => makeCustomCase(CASES[0].query);

check("custom case: scoreRun does not throw", () => {
  scoreRun(customCase(), perfectRun(CASES[0]));
  scoreRun(customCase(), perfectRun(CASES[0]), { judge: { score: 5 } });
});
check("custom case: key-based checks return not run with pass null", () => {
  const scores = scoreRun(customCase(), perfectRun(CASES[0]));
  for (const id of KEY_CHECKS) {
    assert.deepEqual(scores[id], { pass: null, score: null, reason: "no answer key for your own question" }, id);
  }
});
check("custom case: key-free checks still work", () => {
  const scores = scoreRun(customCase(), perfectRun(CASES[0]), { judge: { score: 4 } });
  assert.equal(scores.grounded.pass, true);
  assert.equal(scores.ops.pass, true);
  assert.equal(scores.rubric_judge.pass, true);
  assert.equal(scores.rubric_judge.score, 4);
});
check("custom case: grounded counts numbers typed in the question, and still catches made-up ones", () => {
  const c = makeCustomCase("I spend ₹15,000 on Amazon. Which card?");
  const run = perfectRun(CASES[0]);
  assert.equal(scoreRun(c, run).grounded.pass, true);
  const final = run.steps.at(-1);
  final.reply += " That is 99 points.";
  assert.equal(scoreRun(c, run).grounded.pass, false);
});
check("custom case: grounded works when the question has no amount", () => {
  const c = makeCustomCase("What is the capital of France?");
  const run = { ...perfectRun(CASES[0]), steps: [{ kind: "final", card: "x", reward_inr: 5, reply: "Paris." }] };
  assert.equal(scoreRun(c, run).grounded.pass, false); // reward 5 is in no tool output or question
  run.steps[0].reward_inr = undefined;
  assert.equal(scoreRun(c, run).grounded.pass, true);
});
check("custom case: judgePrompt carries the typed question", () => {
  const p = judgePrompt(customCase(), perfectRun(CASES[0]));
  assert.ok(p.user.includes(CASES[0].query));
});
check("custom case: injectBug works where it can and throws a clear Error where it cannot", () => {
  const c = customCase();
  const run = perfectRun(CASES[0]);
  for (const id of ["wrong_number_in_reply", "skip_tool", "duplicate_call", "invented_tool"]) injectBug(c, run, id);
  assert.throws(() => injectBug(c, run, "right_words_wrong_card"), /no correct card/);
  const noRank = { ...run, steps: run.steps.filter((s) => s.tool !== "rank_cards") };
  assert.throws(() => injectBug(c, noRank, "duplicate_call"), /never ranked/);
  const noFinal = { ...run, steps: run.steps.filter((s) => s.kind !== "final") };
  assert.throws(() => injectBug(c, noFinal, "wrong_number_in_reply"), /no reward number/);
});
check("custom case: perStepAccuracy skips runs of custom cases", () => {
  const run = { ...perfectRun(CASES[0]), caseId: "CUSTOM" };
  assert.equal(perStepAccuracy([run], [customCase()]), 0);
});

console.log(`${passed} checks passed`);
