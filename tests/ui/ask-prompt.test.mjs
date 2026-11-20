// Run: node tests/ui/ask-prompt.test.mjs
import assert from "node:assert/strict";
import { test } from "node:test";
import { buildAskPrompt, ASK_PROMPT_MAX } from "../../evals-lab/src/ui/ask-prompt.js";

const input = {
  title: "Rank the 4 cards",
  what: "Our code ranks the cards by reward.",
  why: "A wrong rank gives a wrong answer.",
  runLines: ["PASSED The tool returned 4 cards.", "Reward: INR 120"],
  terms: [{ term: "tool call", text: "A request from the agent to run a small function." }],
};

test("holds the role, the rules, the context parts and ends with the question line", () => {
  const p = buildAskPrompt(input);
  assert.ok(
    p.startsWith(
      "You help a learner understand one part of a web page called Evals Lab, which teaches how to evaluate an AI agent that picks a credit card.",
    ),
  );
  for (const rule of [
    "Answer only from the CONTEXT",
    'say "I do not know from this lab"',
    "plain words",
    "at most 5 sentences",
    "Never invent numbers",
  ])
    assert.ok(p.includes(rule), rule);
  for (const part of [
    "CONTEXT:",
    "ELEMENT: Rank the 4 cards",
    "WHAT IT IS: Our code ranks the cards by reward.",
    "WHY IT MATTERS: A wrong rank gives a wrong answer.",
    "THIS RUN:",
    "- PASSED The tool returned 4 cards.",
    "- Reward: INR 120",
    "WORDS:",
    "- tool call: A request from the agent to run a small function.",
  ])
    assert.ok(p.includes(part), part);
  assert.ok(p.endsWith("\nMY QUESTION: "));
  assert.equal(p.split("\n").at(-1), "MY QUESTION: ");
});

test("strips HTML tags and extra spaces from every input", () => {
  const p = buildAskPrompt({
    title: "<b>Title</b>",
    what: "a <script>alert(1)</script>  b",
    why: "<img src=x onerror=1>why",
    runLines: ["<li><b>PASS</b>   ok</li>"],
    terms: [{ term: "<i>t</i>", text: "<u>x</u> y" }],
  });
  assert.ok(!/<[a-z/!]/i.test(p), p);
  assert.ok(p.includes("ELEMENT: Title") && p.includes("- PASS ok") && p.includes("- t: x y"));
});

test("no run lines: says so; no terms: no WORDS block", () => {
  const p = buildAskPrompt({ title: "T", what: "w.", why: "y." });
  assert.ok(p.includes("THIS RUN:\n- No run yet."));
  assert.ok(!p.includes("WORDS:"));
});

test("length cap: long run lines are cut from the end, the prompt says so, the question line stays", () => {
  const runLines = Array.from({ length: 40 }, (_, i) => `Line ${i}: ${"x".repeat(150)}`);
  const p = buildAskPrompt({ ...input, runLines });
  assert.ok(p.length <= ASK_PROMPT_MAX, String(p.length));
  assert.ok(p.includes("- Line 0:"), "first lines stay");
  assert.ok(!p.includes("- Line 39:"), "last lines go");
  assert.ok(p.includes("(Some lines were left out to keep this short.)"));
  assert.ok(p.endsWith("MY QUESTION: "));
});

test("length cap holds for very long title, what, why and many terms", () => {
  const long = "word ".repeat(400);
  const terms = Array.from({ length: 20 }, (_, i) => ({ term: `term ${i}`, text: long }));
  const p = buildAskPrompt({ title: long, what: long, why: long, runLines: [long, long], terms });
  assert.ok(p.length <= ASK_PROMPT_MAX, String(p.length));
  assert.ok(p.endsWith("MY QUESTION: "));
});

test("deterministic: the same input gives the same prompt", () => {
  assert.equal(buildAskPrompt(input), buildAskPrompt(structuredClone(input)));
});

test("holds no URL", () => {
  assert.ok(!/https?:|www\./i.test(buildAskPrompt(input)));
});
