// Hand audit of ALL 60 in-scope answers of the frozen design (D1) on the TEST set, block test:final:D1@t0.2.
// Labels are one reviewer's judgement (the agent that ran the experiment), NOT a measurement. Rules, set before labelling:
//   right                 states the gold fact and nothing the repo copy contradicts. Harmless detail that is consistent
//                         with the repo copy (for example "before it runs", read from the wiring boxes) is allowed.
//   true-but-incomplete   nothing false, but the gold fact is missing (a lenient reader might accept it). A false refusal
//                         ("I do not know from this lab." for an answerable question) is labelled here and noted.
//   wrong                 contradicts the repo copy, or adds a lab-specific claim the copy does not make and that matters.
// Output: benchmarks/ask-help-guarded-audit.json. Usage: node scripts/ask-help-guarded-audit.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const res = JSON.parse(readFileSync(join(ROOT, "benchmarks/ask-help-guarded-results.json"), "utf8"));
const R = "right";
const I = "true-but-incomplete";
const W = "wrong";
// id -> [label of run 1, run 2, run 3] and one line of why (what decided the label, per question)
const LABELS = {
  NS01: [[R, R, R], "repeats the gold sentence"],
  NS02: [
    [I, I, W],
    "never says 'every answer'; run 3 adds that guardrails and checks 'adapt to various inputs', which the copy does not say",
  ],
  NS03: [
    [R, R, R],
    "run 1 and 3 add 'before it runs the actual tool call': not in the pop-up, consistent with the wiring",
  ],
  NS04: [[R, R, R], "amount and category both named"],
  NS05: [
    [W, W, W],
    "says the draft is created 'after clicking the draft element/button', which is false; never says 'from the tool results'",
  ],
  NS06: [
    [I, W, I],
    "never names the wrong card or made-up number; run 2 says the checker 'refuses to provide a valid answer' (the refuse box does that, not this checker)",
  ],
  NS07: [[R, R, R], "gold sentence"],
  NS08: [
    [W, I, W],
    "runs 1 and 3 describe the steps of a run; run 2 says pass or fail but misses 'all check results on one page'",
  ],
  NS09: [
    [W, R, W],
    "answers 'no' correctly; runs 1 and 3 add that the judge 'runs the agent and marks the result with checks', which describes an eval, not the judge",
  ],
  NS10: [[R, R, R], "gold sentence"],
  NS11: [[R, R, R], "gold sentence"],
  NS12: [[W, W, W], "'Yes, the model runs the tool.' contradicts 'the model only chooses which one to call'"],
  NS13: [
    [I, I, I],
    "FALSE REFUSAL: the input gate found no lab word ('grounding', 'failure') and answered 'I do not know from this lab.'",
  ],
  NS14: [[R, R, R], "PASS, FAIL, NOT RUN"],
  NS15: [
    [R, R, W],
    "runs 1 and 2: calls a tool until a final answer, plus checks that the wiring has; run 3 invents a pass bar loop that 'stops and checks the next tool'",
  ],
  NS16: [[R, R, R], "no single check catches every bug"],
  NS17: [[R, R, R], "no, it catches mistakes"],
  NS18: [
    [R, I, I],
    "run 1 says problems 'might be hidden until a user finds them'; runs 2 and 3 say 'identify and fix problems early', no 'hidden'",
  ],
  NS19: [[R, R, R], "one attempt, question to answer"],
  NS20: [[R, R, R], "a request to run a function, such as ranking cards"],
};
const block = res.blocks["test:final:D1@t0.2"];
const rows = block.scored
  .filter((s) => s.group === "in_scope")
  .map((s) => {
    const [labels, why] = LABELS[s.id];
    return { id: s.id, run: s.run, checkerPass: s.pass, stage: s.stage, text: s.text, label: labels[s.run], why };
  });
const count = (l) => rows.filter((r) => r.label === l).length;
const out = {
  block: "test:final:D1@t0.2",
  inScopeAnswers: rows.length,
  checkerPassed: rows.filter((r) => r.checkerPass).length,
  right: count(R),
  trueButIncomplete: count(I),
  wrong: count(W),
  strictPass: count(R),
  lenientPass: count(R) + count(I),
  checkerPassedButNotRight: rows.filter((r) => r.checkerPass && r.label !== R).length,
  rightButCheckerFailed: rows.filter((r) => !r.checkerPass && r.label === R).length,
  falseRefusals: rows.filter((r) => r.stage === "input" || r.stage === "output").length,
  rows,
};
if (rows.length !== 60) throw new Error(`expected 60 in-scope answers, got ${rows.length}`);
writeFileSync(join(ROOT, "benchmarks/ask-help-guarded-audit.json"), JSON.stringify(out, null, 2) + "\n");
console.log({ ...out, rows: undefined });
