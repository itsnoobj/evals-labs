// Run from repo root: node tests/ui/chat-ui.test.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CASES, CARDS, CATEGORY_LABELS, perfectRun } from "../../evals-lab/src/task/cases.js";
import { chatHtml } from "../../evals-lab/src/ui/chat-ui.js";

let n = 0;
const ok = (c, m) => {
  assert.ok(c, m);
  n++;
};
const has = (h, s, m) => ok(h.includes(s), m ?? `missing: ${s}`);
const lacks = (h, s, m) => ok(!h.includes(s), m ?? `unexpected: ${s}`);
// Wire blocks are <section class="wire ..."> and never nest.
const stripWire = (h) => h.replace(/<section class="wire[\s\S]*?<\/section>/g, "");

const c = CASES[0];
const cardNames = Object.fromEntries(Object.entries(CARDS).map(([id, v]) => [id, v.name]));
const goodSteps = perfectRun(c).steps;
const wrongSteps = goodSteps.map((s) => (s.kind === "final" ? { ...s, card: "hdfc_infinia" } : s));
const wrongReward = goodSteps.map((s) => (s.kind === "final" ? { ...s, reward_inr: s.reward_inr + 5 } : s));
const refusedSteps = [
  {
    kind: "final",
    card: null,
    reward_inr: null,
    reply: "I could not verify an answer",
    ms: 5,
    tokens: 3,
    validJson: true,
  },
];
const base = {
  kind: "simple",
  title: "Simple agent",
  subtitle: "One try",
  practices: [
    { label: "Checker", on: false },
    { label: "Low randomness", on: true },
  ],
  question: "Which card? <script>alert(1)</script>",
  attempts: [{ steps: goodSteps, verdict: null }],
  shown: 0,
  events: [],
  outcome: null,
  pending: false,
  expected: c.expected,
  cardNames,
  scores: null,
  metrics: [],
};

// good run
const good = chatHtml(base);
lacks(good, "<script>", "question must be escaped");
has(good, "Which card? &lt;script&gt;alert(1)&lt;/script&gt;");
has(good, "Checking what kind of spending this is");
has(good, "It is amazon", "no labels: the id is humanised");
has(chatHtml({ ...base, categoryLabels: CATEGORY_LABELS }), "It is Amazon.in", "labels replace the humanised id");
has(good, "Comparing your 4 cards for ₹15,000");
has(good, 'class="rbars"');
has(good, 'class="ccard"');
has(good, "HDFC Swiggy");
has(good, "Earns ₹750 back");
has(good, "5%");
has(good, "MATCH");
lacks(good, "NO MATCH");
lacks(good, "NO ANSWER");
has(good, "Expected HDFC Swiggy or ICICI Amazon Pay · ₹750", "a tie shows both accepted cards");
has(good, "Got HDFC Swiggy · ₹750");
has(good, "ON</b>");
has(good, "OFF</b>");

// wrong card and wrong reward
const wrong = chatHtml({ ...base, attempts: [{ steps: wrongSteps, verdict: null }] });
has(wrong, "NO MATCH");
has(wrong, "Got HDFC Infinia");

// ties: either accepted card is a MATCH, a card outside accept is not, an old-shape key (card only) still works
const otherTie = goodSteps.map((s) => (s.kind === "final" ? { ...s, card: "icici_amazon_pay" } : s));
const tieHtml = chatHtml({ ...base, attempts: [{ steps: otherTie, verdict: null }] });
has(tieHtml, "MATCH");
lacks(tieHtml, "NO MATCH");
has(tieHtml, "Got ICICI Amazon Pay · ₹750");
const oldKey = { card: "hdfc_swiggy", reward_inr: 750 };
has(chatHtml({ ...base, expected: oldKey }), "Expected HDFC Swiggy · ₹750");
lacks(chatHtml({ ...base, expected: oldKey }), "NO MATCH");
has(
  chatHtml({ ...base, expected: oldKey, attempts: [{ steps: otherTie, verdict: null }] }),
  "NO MATCH",
  "old key accepts only its card",
);
has(
  chatHtml({
    ...base,
    expected: { ...c.expected, accept: ["hdfc_swiggy"] },
    attempts: [{ steps: otherTie, verdict: null }],
  }),
  "NO MATCH",
  "single accept excludes the other tie card",
);
has(chatHtml({ ...base, attempts: [{ steps: wrongReward, verdict: null }] }), "NO MATCH");

// refused
const refused = chatHtml({
  ...base,
  kind: "careful",
  attempts: [{ steps: refusedSteps, verdict: { ok: false, problems: ["x"] } }],
  outcome: "refused",
});
lacks(refused, 'class="ccard"', "no card visual when refused");
has(refused, "No answer given");
has(refused, "I could not verify an answer");
has(refused, "NO ANSWER");
lacks(refused, "NO MATCH");
has(refused, "Got none");

// fallback tag, error and invalid steps
const fb = chatHtml({
  ...base,
  attempts: [{ steps: goodSteps.map((s) => (s.kind === "final" ? { ...s, source: "fallback" } : s)), verdict: null }],
});
has(fb, "Built from the lookup result");
lacks(good, "Built from the lookup result");
const weird = chatHtml({
  ...base,
  attempts: [
    {
      steps: [
        { kind: "tool", tool: "nope", args: {}, output: { error: "unknown tool: nope" }, ms: 1, tokens: 1 },
        { kind: "tool", tool: "rank_cards", args: { amount: 5 }, output: { error: "bad" }, ms: 1, tokens: 1 },
        { kind: "invalid", raw: "not json {", ms: 2, tokens: 2, validJson: false },
      ],
      verdict: null,
    },
  ],
  expected: null,
});
ok(weird.split("The lookup failed").length === 3, "two lookup errors");
has(weird, "The lookup failed: unknown tool: nope");
const sp = chatHtml({ ...base, attempts: [], systemPrompt: "PROMPT <x>" });
has(sp, "System prompt");
has(sp, "PROMPT &lt;x&gt;");
has(sp, "contains no card rates");
lacks(chatHtml({ ...base, attempts: [] }), "System prompt");
has(weird, "The assistant sent a reply that could not be read");
has(weird, "not json {", "raw invalid text in wire");

// pending and expected null
const pend = chatHtml({ ...base, pending: true });
has(pend, "typing");
lacks(pend, "Answer key check");
const noKey = chatHtml({ ...base, expected: null });
for (const s of ["Answer key", "Expected", "MATCH", "NO ANSWER"]) lacks(noKey, s, `key string ${s} leaked`);
// a typed question (expected null) with a finished run says there is no key, in words, and does not crash
has(noKey, "No answer key for your own question. The checks that need a key were not run.");
has(noKey, "NO KEY");
has(noKey, 'class="chat-res off"');
has(noKey, 'class="ccard"', "the answer card still shows");
has(weird, "No answer key for your own question", "odd steps and no key do not crash");
lacks(chatHtml({ ...base, attempts: [], expected: null }), "No answer key", "idle chat shows no result block");
lacks(chatHtml({ ...base, pending: true, expected: null }), "No answer key", "pending shows no result block");
has(
  chatHtml({
    ...base,
    kind: "careful",
    attempts: [{ steps: refusedSteps, verdict: null }],
    outcome: "refused",
    expected: null,
  }),
  "No answer key",
  "refused typed question",
);
// a blocked question: one bubble with the reason, a tag, a result block in words, and no steps
const guardEv = [
  {
    t: "guard_in_fail",
    attempt: 0,
    text: "This agent only picks a credit card <b>for</b> a purchase.",
    rule: "off_topic",
  },
];
const blocked = chatHtml({
  ...base,
  kind: "careful",
  attempts: [{ steps: [], verdict: null }],
  events: guardEv,
  outcome: "blocked",
  expected: null,
});
has(blocked, "Stopped before the model ran: This agent only picks a credit card &lt;b&gt;for&lt;/b&gt; a purchase.");
lacks(blocked, "<b>for</b>", "reason is escaped");
has(blocked, '<span class="tag bad">Blocked by a guardrail</span>');
ok((blocked.match(/Stopped before the model ran/g) ?? []).length === 1, "exactly one blocked bubble");
has(blocked, "BLOCKED");
has(blocked, "The question was stopped before the model ran, so there is no answer to check.");
for (const s of ["MATCH", "NO KEY", 'class="ccard"', "Answer key check"]) lacks(blocked, s, `blocked has no ${s}`);
has(
  chatHtml({ ...base, kind: "careful", attempts: [{ steps: [], verdict: null }], events: [], outcome: "blocked" }),
  "Stopped before the model ran: the question did not pass",
  "missing event: generic reason",
);
const blockedWithKey = chatHtml({
  ...base,
  kind: "careful",
  attempts: [{ steps: [], verdict: null }],
  events: guardEv,
  outcome: "blocked",
  expected: c.expected,
});
has(blockedWithKey, "BLOCKED");
lacks(blockedWithKey, "NO MATCH", "blocked beats a key");
lacks(
  chatHtml({
    ...base,
    kind: "careful",
    attempts: [{ steps: [], verdict: null }],
    events: guardEv,
    outcome: "blocked",
    pending: true,
  }),
  "BLOCKED",
  "no result while pending",
);

// wire content only inside wire blocks
const outside = stripWire(good);
has(good, "asked");
lacks(outside, "asked");
lacks(outside, "&quot;category&quot;");
lacks(outside, "text pieces");
has(good, "&quot;category&quot;:&quot;amazon&quot;");
has(good, "800 ms · 60 text pieces");
has(good, 'class="tl"');
lacks(outside, 'class="tl"');
ok((good.match(/<section class="wire/g) ?? []).length >= 4, "wire blocks present");
lacks(
  chatHtml({
    ...base,
    attempts: [
      { steps: [{ ...goodSteps[0], output: { category: "fuel_hpcl", note: "x".repeat(400) } }], verdict: null },
    ],
  }),
  "x".repeat(250),
  "long JSON truncated",
);

// rejected attempts, events, scorecard (careful retry)
const retry = chatHtml({
  ...base,
  kind: "careful",
  title: "Careful agent",
  shown: 1,
  outcome: "passed_after_retry",
  attempts: [
    { steps: wrongSteps, verdict: { ok: false, problems: ["Final card is not the top ranked card"] } },
    { steps: goodSteps, verdict: { ok: true, problems: [] } },
  ],
  events: [{ t: 3100, attempt: 0, text: "Checker found a problem, retrying" }],
  scores: {
    m1: { pass: true, reason: "fine" },
    m2: { pass: false, reason: "bad route" },
    m3: { pass: null, reason: "" },
  },
  metrics: [
    { id: "m1", label: "Route" },
    { id: "m2", label: "Args" },
    { id: "m3", label: "Cost" },
  ],
});
has(retry, "Try 1: rejected by the checker");
has(retry, "Final card is not the top ranked card");
lacks(stripWire(retry), "Final card is not the top ranked card", "problems only in wire");
lacks(stripWire(retry), "rejected by the checker");
has(retry, "Checker found a problem, retrying");
lacks(stripWire(retry), "Checker found a problem");
for (const w of ["PASS", "FAIL", "NOT RUN"]) {
  has(retry, w);
  lacks(stripWire(retry), w);
}
has(retry, "bad route");
has(retry, "MATCH");
lacks(retry, "NO MATCH", "result uses the shown attempt");

// the small box row is gone: the wiring graph replaces it
lacks(retry, 'class="pipe"');
lacks(retry, "wire-pipeline");
lacks(retry, "USED");

// css
const css = readFileSync(new URL("../../evals-lab/src/styles/chat.css", import.meta.url), "utf8");
ok(
  /\.chat \.wire\s*\{\s*display:\s*none/.test(css) && /\.show-wiring \.chat \.wire\s*\{\s*display:\s*block/.test(css),
  "wire switch css",
);
ok(!/border-radius:\s*[1-9]/.test(css), "no rounded corners");
ok(!/box-shadow:\s*(?!none)\S/.test(css), "no shadows");

console.log(`${n} checks passed`);
