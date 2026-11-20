import test from "node:test";
import assert from "node:assert/strict";
import {
  METRICS,
  scoreRun,
  summarizeGrid,
  stepCorrectness,
  perStepAccuracy,
  chainSuccess,
  retryLift,
  judgePrompt,
  parseJudge,
  injectBug,
} from "../../evals-lab/src/evals/engine.js";
import { CASES, CARDS, perfectRun } from "../../evals-lab/src/task/cases.js";

const c1 = CASES[0];
const emptyRun = { caseId: c1.id, steps: [], totalMs: 0, totalTokens: 0 };
const withFinal = (patch, c = c1) => {
  const run = perfectRun(c);
  Object.assign(run.steps.at(-1), patch);
  return run;
};

test("summarizeGrid: no cases, cases with no runs, and mixed results", () => {
  assert.deepEqual(summarizeGrid([]), { nCases: 0, nRuns: 0, avg: 0, allPass: 0, anyPass: 0 });
  assert.deepEqual(summarizeGrid([{ runs: [] }, { runs: [] }]), {
    nCases: 2,
    nRuns: 0,
    avg: 0,
    allPass: 0,
    anyPass: 0,
  });
  const mixed = summarizeGrid([{ runs: [true, true] }, { runs: [true, false] }, { runs: [false] }]);
  assert.deepEqual(mixed, { nCases: 3, nRuns: 5, avg: 3 / 5, allPass: 1, anyPass: 2 });
});

test("parseJudge: scores 0 to 5 are read, out-of-range and non-digit text gives null", () => {
  for (const n of [0, 1, 2, 3, 4, 5]) assert.deepEqual(parseJudge(String(n)), { score: n });
  for (const text of ["", "   ", null, undefined, "6", "9", "10", "score 10", "٣", ".5", "no number"])
    assert.deepEqual(parseJudge(text), { score: null }, JSON.stringify(text));
  assert.deepEqual(parseJudge("5/5"), { score: 5 });
  assert.deepEqual(parseJudge("score: 3.5"), { score: 3 }, "decimal part is not read as its own score");
  assert.deepEqual(parseJudge("0 and 5"), { score: 0 }, "first score wins");
  assert.deepEqual(parseJudge("I give it a 4!\nBecause 2 numbers match"), { score: 4 });
});

test("parseJudge: a negative score is invalid, not read as its digit", () => {
  for (const text of ["-1", "-5", "score: -3"]) assert.deepEqual(parseJudge(text), { score: null }, text);
  assert.deepEqual(parseJudge("-1 then 4"), { score: 4 }, "a later valid score is still found");
});

test("parseJudge: a non-string value is read as text", () => {
  assert.deepEqual(parseJudge(4), { score: 4 });
  assert.deepEqual(parseJudge(40), { score: null });
});

test("chainSuccess and retryLift at the edges", () => {
  assert.equal(chainSuccess(0.5, 0), 1);
  assert.equal(chainSuccess(0, 3), 0);
  assert.equal(chainSuccess(1, 10), 1);
  assert.equal(retryLift(0, 5), 0);
  assert.equal(retryLift(1, 5), 1);
  assert.equal(retryLift(0.5, 0), 0);
  assert.equal(retryLift(0.5, 1), 0.5);
  assert.equal(retryLift(0.5, 3), 0.875);
});

test("an empty run scores without throwing: answer metrics fail, ops passes, judge is not run", () => {
  const s = scoreRun(c1, emptyRun);
  assert.deepEqual(
    Object.keys(s),
    METRICS.map((m) => m.id),
  );
  for (const id of ["trajectory", "task_success", "answer_match", "grounded", "tool_recall"])
    assert.equal(s[id].pass, false, id);
  assert.equal(s.rubric_judge.pass, null);
  assert.match(s.task_success.reason, /no final answer/);
  assert.match(s.tool_recall.reason, /classify_merchant/);
  assert.match(s.tool_recall.reason, /rank_cards/);
});

test("stepCorrectness and perStepAccuracy: empty run counts every expected step as missed", () => {
  assert.deepEqual(stepCorrectness(c1, emptyRun), []);
  assert.equal(perStepAccuracy([emptyRun], CASES), 0);
  assert.equal(perStepAccuracy([], CASES), 0);
});

test("perStepAccuracy ignores runs for unknown case ids", () => {
  const unknown = { ...perfectRun(c1), caseId: "C99" };
  assert.equal(perStepAccuracy([unknown], CASES), 0);
  assert.equal(perStepAccuracy([unknown, perfectRun(c1)], CASES), 1);
});

test("ops: exactly 20 s passes and 20 s plus 1 ms fails", () => {
  const run = perfectRun(c1);
  run.totalMs = 20000;
  assert.equal(scoreRun(c1, run).ops.pass, true);
  run.totalMs = 20001;
  assert.equal(scoreRun(c1, run).ops.pass, false);
});

test("task_success: a reward that is a string fails even when the number matches", () => {
  const run = withFinal({ reward_inr: String(c1.expected.reward_inr) });
  assert.equal(scoreRun(c1, run).task_success.pass, false);
});

test("answer_match: case variants of the card name pass, an empty, null or numeric reply fails", () => {
  const name = CARDS[c1.expected.card].name;
  assert.equal(scoreRun(c1, withFinal({ reply: `USE ${name.toUpperCase()} NOW` })).answer_match.pass, true);
  assert.equal(scoreRun(c1, withFinal({ reply: `use ${name.toLowerCase()}` })).answer_match.pass, true);
  for (const reply of ["", null, undefined, 42])
    assert.equal(scoreRun(c1, withFinal({ reply })).answer_match.pass, false);
});

test("grounded: numbers written with Indian grouping are read as one number", () => {
  const run = withFinal({ reply: `Use ${CARDS[c1.expected.card].name}. ₹1,50,000 maybe` });
  const g = scoreRun(c1, run).grounded;
  assert.equal(g.pass, false);
  assert.match(g.reason, /150000/);
});

test("grounded: a null reply with a grounded reward still scores without throwing", () => {
  const g = scoreRun(c1, withFinal({ reply: null })).grounded;
  assert.equal(g.pass, true);
});

test("rubric_judge: boundaries 0, 3, 4, 5 and a non-number score", () => {
  const run = perfectRun(c1);
  const judged = (score) => scoreRun(c1, run, { judge: { score } }).rubric_judge;
  assert.equal(judged(0).pass, false);
  assert.equal(judged(3).pass, false);
  assert.equal(judged(4).pass, true);
  assert.equal(judged(5).pass, true);
  assert.deepEqual(judged("5"), { pass: null, score: null, reason: "not run" });
  assert.deepEqual(judged(null), { pass: null, score: null, reason: "not run" });
});

test("judgePrompt: a run with no steps says so, and a typed question with unicode is carried whole", () => {
  const { user } = judgePrompt(c1, emptyRun);
  assert.match(user, /\(no tool calls\)/);
  assert.match(user, /\(no reply\)/);
  const typed = {
    id: "CUSTOM",
    query: "ಇಂದು ₹800 🍕",
    custom: true,
    merchant: null,
    amount: 800,
    expected: null,
    expectedTrajectory: null,
  };
  assert.ok(judgePrompt(typed, perfectRun(c1)).user.includes("Question: ಇಂದು ₹800 🍕"));
});

test("injectBug throws on an unknown bug id for a case with an answer key", () => {
  assert.throws(() => injectBug(c1, perfectRun(c1), "no_such_bug"));
});
