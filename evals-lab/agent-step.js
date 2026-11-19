// One agent loop for the Evals Lab: prompt, parse, run tools, repeat. No DOM and no WebLLM import,
// so the same code runs in the browser, in node, and against a fake `chat` in tests.
// Contract: docs/specs/engine-contract.md
//   chat: async ({ messages, temperature, seed, max_tokens, response_format }) -> { text, tokens, ms }
import { runTool, CARDS, CATEGORIES } from "./cases.js";

// Short on purpose: tiny models lose the plot in long prompts. One example per JSON shape.
export const SYSTEM_PROMPT_V1 = [
  "You pick the best credit card for a purchase. Reply with ONE JSON object per turn and nothing else.",
  "Tools:",
  "- classify_merchant(merchant) -> category",
  "- rank_cards(amount, category) -> cards ranked best first",
  'Call a tool: {"tool":"classify_merchant","args":{"merchant":"Amazon"}}',
  'Final answer: {"final":{"card":"<card id>","reward_inr":<number>,"reply":"<one sentence>"}}',
  "Call classify_merchant first, then rank_cards, then give the final answer using the first ranked card.",
].join("\n");

// v2 spells out the three steps in order and puts the tool-call shapes first. v1 let tiny models jump
// straight to the final answer (they copy the last example they saw), see spike/RESULTS.md.
export const SYSTEM_PROMPT_V2 = [
  "You pick the best credit card for a purchase. Reply with ONE JSON object per turn and nothing else.",
  'Step 1: {"tool":"classify_merchant","args":{"merchant":"<merchant name from the question>"}}',
  'Step 2: {"tool":"rank_cards","args":{"amount":<number from the question>,"category":"<category from step 1>"}}',
  'Step 3: {"final":{"card":"<card id of the first ranked card>","reward_inr":<its reward_inr>,"reply":"<one sentence>"}}',
  "Always start with step 1. Never skip a step. Only use numbers from tool results.",
].join("\n");

export const PROMPTS = { v1: SYSTEM_PROMPT_V1, v2: SYSTEM_PROMPT_V2 };

// v2 is the default: it is the better of the two prompts in spike/RESULTS.md.
export const SYSTEM_PROMPT = SYSTEM_PROMPT_V2;

// Grammar for ONE step, for XGrammar structured generation in WebLLM. Enums stop the model from inventing
// tools, categories or card ids, so what is left are real decisions (order, args, card, number).
// WebLLM wants the schema as a JSON STRING: response_format { type: "json_object", schema: "<json>" }.
// Measured on WebLLM 0.2.79 (spike/RESULTS.md): a top-level `oneOf` is NOT enforced (output was `{}` or
// unconstrained JSON), `anyOf` is. Objects need additionalProperties:false, and a bare `args: {type:"object"}`
// let the model write junk keys, so args get their two real shapes.
const argsSchema = {
  anyOf: [
    { type: "object", properties: { merchant: { type: "string" } }, required: ["merchant"], additionalProperties: false },
    { type: "object", properties: { amount: { type: "number" }, category: { enum: CATEGORIES } }, required: ["amount", "category"], additionalProperties: false },
  ],
};
export const STEP_SCHEMA = {
  anyOf: [
    {
      type: "object",
      properties: { tool: { enum: ["classify_merchant", "rank_cards"] }, args: argsSchema },
      required: ["tool", "args"],
      additionalProperties: false,
    },
    {
      type: "object",
      properties: {
        final: {
          type: "object",
          properties: { card: { enum: Object.keys(CARDS) }, reward_inr: { type: "number" }, reply: { type: "string" } },
          required: ["card", "reward_inr", "reply"],
          additionalProperties: false,
        },
      },
      required: ["final"],
      additionalProperties: false,
    },
  ],
};

// constrain wins over jsonMode: a schema only makes sense with JSON output on.
export function responseFormat({ jsonMode = true, constrain = false } = {}) {
  if (constrain) return { type: "json_object", schema: JSON.stringify(STEP_SCHEMA) };
  return jsonMode === false ? undefined : { type: "json_object" };
}

const INVALID_NUDGE = 'That was not a valid step. Reply with ONE JSON object: a tool call {"tool":...,"args":...} or {"final":...}.';

// The history is rebuilt from the recorded steps, so a Run and its prompt can never drift apart.
export function buildMessages(c, steps, { system = SYSTEM_PROMPT } = {}) {
  const messages = [
    { role: "system", content: system },
    { role: "user", content: c.query },
  ];
  for (const step of steps) {
    messages.push({ role: "assistant", content: step.raw });
    messages.push({
      role: "user",
      content: step.kind === "tool" ? `Tool result: ${JSON.stringify(step.output)}\nNext JSON step:` : INVALID_NUDGE,
    });
  }
  return messages;
}

const isPlainObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

// Strict on purpose: the eval should show what the model really emitted, so no fence stripping or repair.
function parseStep(text) {
  let obj;
  try {
    obj = JSON.parse(String(text).trim());
  } catch {
    return { why: "not valid JSON" };
  }
  if (isPlainObject(obj?.final)) return { final: obj.final };
  if (typeof obj?.tool === "string") return { tool: obj.tool, args: isPlainObject(obj.args) ? obj.args : {} };
  return { why: "JSON has neither tool nor final" };
}

// retryInvalid=false (v1): an invalid step uses up one of the maxSteps, then the loop continues.
// retryInvalid=true: invalid steps are free (at most 2 per case), so a later screen can show retry lift.
export async function runCase(chat, c, opts = {}) {
  // onStep(steps) fires after every step so a UI can show progress; it never changes the run.
  const { model = "unknown", temperature = 0.7, seed = 42, maxSteps = 4, maxTokens = 160, retryInvalid = false, system, jsonMode = true, constrain = false, onStep } = opts;
  const response_format = responseFormat({ jsonMode, constrain });
  const maxFreeRetries = 2;
  const steps = [];
  let turns = 0;
  let freeRetries = 0;

  while (turns < maxSteps) {
    const messages = buildMessages(c, steps, { system });
    // A new seed per step, otherwise every step would start from the same random stream.
    const { text, tokens, ms } = await chat({ messages, temperature, seed: seed + steps.length, max_tokens: maxTokens, response_format });
    const parsed = parseStep(text);
    const base = { raw: text, ms, tokens };

    if (parsed.final) {
      const { card, reward_inr, reply } = parsed.final;
      steps.push({ kind: "final", card, reward_inr, reply, ...base, validJson: true });
      onStep?.(steps);
      break;
    }
    if (parsed.tool) {
      // Unknown tool names go through runTool too, which answers with an error output.
      steps.push({ kind: "tool", tool: parsed.tool, args: parsed.args, output: runTool(parsed.tool, parsed.args), ...base, validJson: true });
      onStep?.(steps);
      turns += 1;
      continue;
    }
    steps.push({ kind: "invalid", ...base, validJson: false, why: parsed.why });
    onStep?.(steps);
    if (retryInvalid && freeRetries < maxFreeRetries) freeRetries += 1;
    else turns += 1;
  }

  return {
    caseId: c.id, model, temperature, seed, steps,
    totalMs: steps.reduce((sum, s) => sum + s.ms, 0),
    totalTokens: steps.reduce((sum, s) => sum + s.tokens, 0),
  };
}

// ---- node self-check: `node evals-lab/agent-step.js --selfcheck` ----
async function selfcheck() {
  const { default: assert } = await import("node:assert/strict");
  const { CASES, perfectRun } = await import("./cases.js");
  const { scoreRun, summarizeGrid, perStepAccuracy } = await import("./engine.js");

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

  console.log("selfcheck ok");
}

if (typeof process !== "undefined" && process.argv?.includes("--selfcheck")) {
  selfcheck().catch((err) => { console.error(err); process.exit(1); });
}
