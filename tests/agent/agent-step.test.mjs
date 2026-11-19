// Run: node tests/agent/agent-step.test.mjs
import assert from "node:assert/strict";
import { CASES, CARDS, perfectRun } from "../../evals-lab/src/task/cases.js";
import { scoreRun, summarizeGrid, perStepAccuracy } from "../../evals-lab/src/evals/engine.js";
import { runCase, INVALID_NUDGE, PROMPTS, SYSTEM_PROMPT_V1, SYSTEM_PROMPT_V2 } from "../../evals-lab/src/agent/agent-step.js";

// Plays back scripted model outputs and records every prompt it was given.
const scripted = (texts) => {
  const calls = [];
  const chat = async (req) => {
    calls.push(req);
    return { text: texts[calls.length - 1] ?? texts.at(-1), tokens: 10, ms: 100 };
  };
  return { chat, calls };
};
const perfectTexts = (c) => perfectRun(c).steps.map((s) => s.raw);
const classifyText = JSON.stringify({ tool: "classify_merchant", args: { merchant: "Amazon" } });
const rankText = JSON.stringify({ tool: "rank_cards", args: { amount: 15000, category: "amazon" } });

// 1. Perfect run on every case: exact Run shape, every deterministic metric passes.
const perfectRuns = [];
for (const c of CASES) {
  const { chat, calls } = scripted(perfectTexts(c));
  const run = await runCase(chat, c, { model: "fake", temperature: 0.7, seed: 1000 });
  assert.deepEqual(Object.keys(run), ["caseId", "model", "temperature", "seed", "steps", "totalMs", "totalTokens"]);
  assert.equal(run.caseId, c.id);
  assert.deepEqual(run.steps.map((s) => s.kind), ["tool", "tool", "final"]);
  assert.equal(run.totalMs, 300);
  assert.equal(run.totalTokens, 30);
  assert.deepEqual(calls.map((r) => r.seed), [1000, 1001, 1002]);
  assert.equal(calls[0].messages[1].content, c.query);
  assert.equal(calls[2].messages.length, 6); // system, user, 2 x (assistant + tool result)
  const scores = scoreRun(c, run);
  for (const id of ["trajectory", "task_success", "answer_match", "grounded", "tool_recall", "tool_precision", "ops"]) {
    assert.equal(scores[id].pass, true, `${c.id} ${id}: ${scores[id].reason}`);
  }
  perfectRuns.push(run);
}
assert.equal(perStepAccuracy(perfectRuns, CASES), 1);

// 2. Broken run: invalid JSON, unknown tool, then a wrong final. Loop stops at the final.
const c01 = CASES[0];
const broken = scripted([
  "not json",
  JSON.stringify({ tool: "check_credit_limit", args: {} }),
  classifyText,
  JSON.stringify({ final: { card: "hdfc_infinia", reward_inr: 150, reply: "Use HDFC Infinia." } }),
]);
const brokenRun = await runCase(broken.chat, c01, { model: "fake" });
assert.deepEqual(brokenRun.steps.map((s) => s.kind), ["invalid", "tool", "tool", "final"]);
assert.equal(brokenRun.steps[0].validJson, false);
assert.match(brokenRun.steps[1].output.error, /unknown tool/);
assert.equal(broken.calls[1].messages.at(-1).content, INVALID_NUDGE);
const brokenScores = scoreRun(c01, brokenRun);
assert.equal(brokenScores.task_success.pass, false);
assert.equal(brokenScores.ops.pass, false);
assert.equal(brokenScores.tool_precision.pass, false);
assert.equal(summarizeGrid([{ caseId: "C01", runs: [true, false] }]).avg, 0.5);

// 3. A model that never answers is cut off after 4 steps, with no final step.
const looping = scripted([classifyText]);
const loopRun = await runCase(looping.chat, c01, {});
assert.equal(loopRun.steps.length, 4);
assert.ok(loopRun.steps.every((s) => s.kind === "tool"));
assert.equal(scoreRun(c01, loopRun).task_success.pass, false);

// 4. retryInvalid: two broken steps cost the whole budget without it, and nothing with it.
const texts = ["{oops", "{oops", classifyText, rankText, perfectRun(c01).steps[2].raw];
const noRetry = await runCase(scripted(texts).chat, c01, { retryInvalid: false });
assert.equal(noRetry.steps.some((s) => s.kind === "final"), false);
const withRetry = await runCase(scripted(texts).chat, c01, { retryInvalid: true });
assert.deepEqual(withRetry.steps.map((s) => s.kind), ["invalid", "invalid", "tool", "tool", "final"]);
assert.equal(scoreRun(c01, withRetry).task_success.pass, true);

// 5. response_format per mode, and v2 is the default prompt.
const rf = async (opts) => { const t = scripted([classifyText]); await runCase(t.chat, c01, { maxSteps: 1, ...opts }); return t.calls[0]; };
assert.deepEqual((await rf({})).response_format, { type: "json_object" });
assert.equal("response_format" in (await rf({ jsonMode: false })), true);
assert.equal((await rf({ jsonMode: false })).response_format, undefined);
const constrained = (await rf({ constrain: true })).response_format;
assert.equal(constrained.type, "json_object");
assert.equal(typeof constrained.schema, "string"); // WebLLM takes a JSON string, not an object
const schema = JSON.parse(constrained.schema);
assert.deepEqual(schema.anyOf[0].properties.tool.enum, ["classify_merchant", "rank_cards"]);
assert.deepEqual(schema.anyOf[1].properties.final.properties.card.enum, Object.keys(CARDS));
assert.equal((await rf({})).messages[0].content, SYSTEM_PROMPT_V2);
assert.equal(PROMPTS.v1, SYSTEM_PROMPT_V1);

console.log("agent-step: all checks passed");
