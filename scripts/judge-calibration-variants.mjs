// The judge prompt variants and the protocol constants of the judge-calibration experiment.
// Report: docs/research/judge-calibration.md. This file is hash-frozen before the TEST run (scripts/judge-calibration.frozen.json).
// A variant is built from knobs (rules, examples, answer key, reason first, threshold), the same knobs a learner could turn in a lab.
import { CASES, CARDS } from "../evals-lab/src/task/cases.js";
import { judgePrompt, parseJudge } from "../evals-lab/src/evals/engine.js";
import { parseVerdict, parseWinner, gradeToVerdict } from "./judge-calibration-lib.mjs";

export const MODEL = "Qwen2.5-1.5B-Instruct-q4f16_1-MLC";
export const WEBLLM_VERSION = "0.2.79";
export const DEV_CASES = ["C01", "C02", "C03"];
export const TEST_CASES = ["C04", "C05", "C06"];
// Written before any model call. Applies to the frozen variant on TEST at temperature 0.
export const BAR = { minKappa: 0.4, maxFalsePass: 0.2, minLiftOverJ0: 0.2 };
export const VARIATION_TEMPERATURE = 0.7; // 3 runs, frozen variant, TEST only
export const VARIATION_RUNS = 3;
export const J0_THRESHOLD = 4; // PASS if the 0-5 grade is >= 4, the same cut the lab's own check uses
export const SEED_BASE = 1000;

// Items shown to the judge as worked examples (J2 and later). Dev cases only (C01-C03), order alternates PASS / FAIL.
export const EXAMPLE_IDS = [
  "real:free:C02:1001",
  "real:free:C01:1001",
  "perfect:C03",
  "bug:wrong_number_in_reply:perfect:C02",
];

// Every item that any variant may show as an example. All DEV. DEV scoring leaves them (and look-alikes) out for every variant.
export const EXAMPLE_POOL = [
  ...EXAMPLE_IDS,
  "bug:skip_tool:perfect:C01", // PASS: no classify_merchant call, but the answer is right
  "bug:right_words_wrong_card:perfect:C01", // FAIL: reply names the right card, final card is another
];

const caseOf = (id) => CASES.find((c) => c.id === id);
const finalOf = (run) => run.steps.findLast((s) => s.kind === "final");
const toolsOf = (run) => run.steps.filter((s) => s.kind === "tool");

function toolText(run) {
  return (
    toolsOf(run)
      .map((s) => `${s.tool}: ${JSON.stringify(s.output)}`)
      .join("\n") || "(no tool calls)"
  );
}

function finalText(run) {
  const f = finalOf(run);
  return f ? `card = ${f.card}, reward = ${f.reward_inr}` : "(none)";
}

export function keyText(c) {
  const names = c.expected.accept.map((id) => `${id} (${CARDS[id].name})`).join(" or ");
  return `Answer key: the correct card is ${names}; the correct reward is ${c.expected.reward_inr}.`;
}

// What the judge sees for one run. `withKey` adds the answer key (reference-guided).
export function runText(c, run, { withKey = false } = {}) {
  const f = finalOf(run);
  return (
    `Question: ${c.query}\n` +
    (withKey ? `${keyText(c)}\n` : "") +
    `\nTool results:\n${toolText(run)}\n\nFinal answer: ${finalText(run)}\n\nReply:\n${f?.reply ?? "(no reply)"}`
  );
}

const INTRO = "You are a strict grader of a credit card assistant. Decide if the agent's run is PASS or FAIL.";
const RULES =
  "A run FAILS if any of these is true:\n" +
  "1. The final answer names the wrong card for the question.\n" +
  "2. A number in the reply is not in the tool results or the question.\n" +
  "3. The reward in the final answer is not equal to the top reward in the rank_cards tool result.\n" +
  "Otherwise the run PASSES. If there is no reply, it FAILS.";
// Tuning iteration 1 (DEV): the same three FAIL causes as RULES, but as ordered checks that say where to look.
const RULES_STEPS =
  "Check the run in this order. The correct answer is the first entry of the rank_cards result (the highest reward; another card with the same reward is also correct).\n" +
  '1. Compare the card in "Final answer" with the card in that first entry. FAIL if it is a different card with a lower reward. The reply text does not matter for this check, only the "Final answer" line.\n' +
  '2. Compare the reward in "Final answer" with the reward_inr of that first entry. FAIL if they differ.\n' +
  "3. Look at every number in the reply. FAIL if one is not in the tool results or the question.\n" +
  "Otherwise the run PASSES. If there is no reply, it FAILS.";
// Tuning iteration 2 (DEV): the judge first copies the facts it needs into fixed lines, then gives the verdict.
const FORMAT_WORK =
  "Write these lines exactly, then the verdict line:\n" +
  "TOP CARD: (card of the first rank_cards entry)\n" +
  "TOP REWARD: (reward_inr of the first rank_cards entry)\n" +
  "FINAL CARD: (card in Final answer)\n" +
  "FINAL REWARD: (reward in Final answer)\n" +
  "NUMBERS IN REPLY NOT IN TOOL RESULTS: (list them, or none)\n" +
  "VERDICT: PASS or VERDICT: FAIL";
const NUMBER = /\d+(?:,\d{2,3})*(?:\.\d+)?/g;
export function workLines(c, run) {
  const f = finalOf(run);
  const ranked = toolsOf(run).find((s) => s.tool === "rank_cards")?.output?.ranked ?? [];
  const allowed = new Set([c.amount, ...ranked.flatMap((r) => [r.rate_pct, r.reward_inr])].map(Number));
  const loose = [...new Set((f?.reply ?? "").match(NUMBER) ?? [])].filter(
    (t) => !allowed.has(Number(t.replace(/,/g, ""))),
  );
  return (
    `TOP CARD: ${ranked[0]?.card ?? "none"}\nTOP REWARD: ${ranked[0]?.reward_inr ?? "none"}\n` +
    `FINAL CARD: ${f?.card ?? "none"}\nFINAL REWARD: ${f?.reward_inr ?? "none"}\n` +
    `NUMBERS IN REPLY NOT IN TOOL RESULTS: ${loose.length ? loose.join(", ") : "none"}`
  );
}
const FORMAT_DIRECT = 'Answer with exactly one line: "VERDICT: PASS" or "VERDICT: FAIL".';
const FORMAT_REASON =
  'First write one short sentence with your reason. Then write a new line: "VERDICT: PASS" or "VERDICT: FAIL".';

// Variant definitions. Knobs only; `build` and `buildPair` are derived below.
// extraRules: text appended to the rules (tuning iterations on DEV). order: where the examples go.
const KNOBS = {
  J1: { examples: false, key: false, reasonFirst: false },
  J2: { examples: true, key: false, reasonFirst: false },
  J3: { examples: true, key: true, reasonFirst: false },
  J4: { examples: false, key: false, reasonFirst: true },
  // Tuning iterations on DEV (logged in the report).
  T1: { examples: true, key: false, reasonFirst: false, rules: RULES_STEPS },
  // T3: T1 plus the two extra examples of EXAMPLE_POOL (a PASS that skipped a tool, a FAIL whose reply names the right card).
  T3: { examples: true, key: false, reasonFirst: false, rules: RULES_STEPS, extraExamples: true },
  T2: { examples: true, key: false, reasonFirst: false, rules: RULES_STEPS, work: true },
};

export function makeVariants(itemsById) {
  const example = (id) => {
    const it = itemsById[id];
    if (!it) throw new Error(`example item missing: ${id}`);
    return it;
  };

  const exampleBlock = (knob) =>
    (knob.extraExamples ? EXAMPLE_POOL : EXAMPLE_IDS)
      .map((id, i) => {
        const it = example(id);
        const c = caseOf(it.caseId);
        return `Example ${i + 1}\n${runText(c, it.run, { withKey: knob.key })}\n${knob.work ? `${workLines(c, it.run)}\n` : ""}VERDICT: ${it.gold}`;
      })
      .join("\n\n");

  const system = (knob) =>
    [
      INTRO,
      knob.rules ?? RULES,
      knob.examples ? `Worked examples:\n\n${exampleBlock(knob)}` : null,
      knob.work ? FORMAT_WORK : knob.reasonFirst ? FORMAT_REASON : FORMAT_DIRECT,
    ]
      .filter(Boolean)
      .join("\n\n");

  const systemPair = (knob) =>
    [
      "You are a strict grader of a credit card assistant. You compare two runs, A and B, of the same question.",
      knob.rules ?? RULES,
      knob.examples ? `Worked examples of single runs (for reference):\n\n${exampleBlock(knob)}` : null,
      'The better run is the one that follows the rules. Answer with exactly one line: "WINNER: A" or "WINNER: B".',
    ]
      .filter(Boolean)
      .join("\n\n");

  const v = {};

  // J0: the lab's current judge. Same system and user text as engine.js judgePrompt, but single-shot at temperature 0.
  v.J0 = {
    id: "J0",
    desc: "current prompt, grade 0-5, PASS if grade >= 4",
    maxTokens: 8,
    build: (c, run) => {
      const p = judgePrompt(c, run);
      return [
        { role: "system", content: p.system },
        { role: "user", content: p.user },
      ];
    },
    decide: (text) => gradeToVerdict(parseJudge(text).score, J0_THRESHOLD),
    pair: null,
  };

  // J0F: diagnostic only. J0's system prompt, but the user message also shows the final card and reward (as J1 to J4 do).
  v.J0F = {
    id: "J0F",
    desc: "diagnostic: J0 system prompt, the judge also sees the final card and reward",
    maxTokens: 8,
    build: (c, run) => {
      const p = judgePrompt(c, run);
      return [
        { role: "system", content: p.system },
        { role: "user", content: `${runText(c, run)}\n\nScore (0-5):` },
      ];
    },
    decide: (text) => gradeToVerdict(parseJudge(text).score, J0_THRESHOLD),
    pair: null,
  };

  for (const [id, knob] of Object.entries(KNOBS)) v[id] = fromKnobs(id, knob);

  function fromKnobs(id, knob) {
    return {
      id,
      desc: describe(knob),
      knob,
      maxTokens: knob.work ? 90 : knob.reasonFirst ? 100 : 12,
      build: (c, run) => [
        { role: "system", content: system(knob) },
        { role: "user", content: runText(c, run, { withKey: knob.key }) },
      ],
      decide: parseVerdict,
      pair: {
        maxTokens: 12,
        build: (c, runA, runB) => [
          { role: "system", content: systemPair(knob) },
          {
            role: "user",
            content:
              `Question: ${c.query}\n${knob.key ? `${keyText(c)}\n` : ""}\n` +
              `=== Run A ===\nTool results:\n${toolText(runA)}\nFinal answer: ${finalText(runA)}\nReply:\n${finalOf(runA)?.reply ?? "(no reply)"}\n\n` +
              `=== Run B ===\nTool results:\n${toolText(runB)}\nFinal answer: ${finalText(runB)}\nReply:\n${finalOf(runB)?.reply ?? "(no reply)"}\n\n` +
              "Which run is better, A or B?",
          },
        ],
        decide: parseWinner,
      },
    };
  }

  // Tuning iterations on DEV are added below this line, each logged in the report.

  return v;
}

function describe(k) {
  return [
    k.rules ? "binary PASS/FAIL, ordered-check rubric" : "binary PASS/FAIL, 3-rule rubric",
    k.examples ? `+${k.extraExamples ? 6 : 4} worked examples` : null,
    k.key ? "+answer key" : null,
    k.reasonFirst ? "reason first" : null,
    k.work ? "copy the facts first" : null,
  ]
    .filter(Boolean)
    .join(", ");
}

export const CASE_IDS = CASES.map((c) => c.id);
export { caseOf };

// What the judge sees without the answer key. Two items with the same text are the same judging problem.
export const inputSignature = (item) => runText(caseOf(item.caseId), item.run);

// Pairs for the order-bias check: per TEST case, up to 8 (gold PASS run, gold FAIL run) pairs, spread over the item list,
// de-duplicated by what the judge sees. Deterministic, no model.
export function selectPairs(items, perCase = 8) {
  const out = [];
  for (const caseId of TEST_CASES) {
    const seen = new Set();
    const mine = items
      .filter((i) => i.caseId === caseId)
      .sort((a, b) => (a.id < b.id ? -1 : 1))
      .filter((i) => {
        const sig = inputSignature(i);
        return seen.has(sig) ? false : seen.add(sig);
      });
    const fails = mine.filter((i) => i.gold === "FAIL");
    const passes = mine.filter((i) => i.gold === "PASS");
    const n = Math.min(perCase, fails.length);
    for (let j = 0; j < n; j++) {
      const bad = fails[Math.floor((j * fails.length) / n)];
      const good = passes[(j * 3) % passes.length];
      out.push({ caseId, goodId: good.id, badId: bad.id });
    }
  }
  return out;
}
