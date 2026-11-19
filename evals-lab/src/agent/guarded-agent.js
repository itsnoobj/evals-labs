// The "careful agent": forced reply format, low randomness, a checker after each try, up to 3 tries,
// a fallback built from the tool result, and a refusal when nothing can be trusted.
// Pure ES module, no DOM. Spec: docs/specs/compare-agents.md
// The checker only reads the question text and the run's own steps. It never sees the answer key.
import { runCase } from "./agent-step.js";
import { CARDS, TOOLS } from "../task/cases.js";
import { checkInput, checkOutput, INPUT_RULES } from "./guardrails.js";

// Same idea as NUMBER_PATTERN in engine.js: handles "15,000", "2,400" and "1.5".
const NUMBER_PATTERN = /\d+(?:,\d{2,3})*(?:\.\d+)?/g;
const numbersIn = (text) => (String(text ?? "").match(NUMBER_PATTERN) ?? []).map((t) => Number(t.replace(/,/g, "")));

const REFUSAL_REPLY = "I could not verify an answer, so I am not giving one. Please ask again or contact support.";

// Runs the five checker rules, plus the output guardrails (rules[6]). Returns the problems per rule, so the fallback can ask
// "did the tools run correctly" (rules 1 and 2) without a second pass over the run.
function checkRules(c, run) {
  const question = String(c.query ?? "");
  const questionLower = question.toLowerCase();
  const questionNumbers = numbersIn(question);
  const toolSteps = run.steps.filter((s) => s.kind === "tool");
  const classify = toolSteps.find((s) => s.tool === "classify_merchant");
  const rank = toolSteps.find((s) => s.tool === "rank_cards");
  const final = run.steps.findLast((s) => s.kind === "final");
  const rules = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };

  // Rule 1: the merchant was looked up, and it is a merchant the user actually named.
  if (!classify) rules[1].push("The agent never looked up the merchant's category with classify_merchant.");
  else if (classify.output?.error) rules[1].push("classify_merchant returned an error.");
  else {
    const merchant = String(classify.args?.merchant ?? "").trim().toLowerCase();
    if (!merchant || !questionLower.includes(merchant)) {
      rules[1].push(`The merchant "${classify.args?.merchant ?? ""}" passed to classify_merchant is not in the question.`);
    }
  }

  // Rule 2: the cards were ranked for the right amount and the category the lookup returned.
  if (!rank) rules[2].push("The agent never ranked the cards with rank_cards.");
  else if (rank.output?.error) rules[2].push("rank_cards returned an error.");
  else {
    if (!questionNumbers.includes(Number(rank.args?.amount))) {
      rules[2].push(`The amount passed to rank_cards (${rank.args?.amount}) is not the amount in the question.`);
    }
    const category = classify && !classify.output?.error ? classify.output?.category : undefined;
    if (!category) rules[2].push("The category passed to rank_cards could not be checked because classify_merchant gave no category.");
    else if (rank.args?.category !== category) {
      rules[2].push("The category passed to rank_cards does not match what classify_merchant returned.");
    }
  }

  // Rule 3: the final card is a top-ranked card (any card tied for the top reward) with that reward.
  const top = rank && !rank.output?.error ? rank.output?.ranked?.[0] : undefined;
  if (!final) rules[3].push("The agent never gave a final answer.");
  else if (!top) rules[3].push("The final answer cannot be checked because there is no ranking from rank_cards.");
  else {
    const tied = rank.output.ranked.filter((row) => row.reward_inr === top.reward_inr).map((row) => row.card);
    if (!tied.includes(final.card)) rules[3].push("The card in the final answer is not the top-ranked card from rank_cards.");
    if (!(Math.abs(Number(final.reward_inr) - top.reward_inr) <= 0.5)) {
      rules[3].push("The reward in the final answer does not match the top-ranked card's reward from rank_cards.");
    }
  }

  // Rule 4: no number in the reply that is missing from the question and the tool results.
  if (final) {
    const allowed = [...questionNumbers];
    for (const step of toolSteps) {
      for (const row of step.output?.ranked ?? []) allowed.push(row.rate_pct, row.reward_inr);
    }
    const loose = numbersIn(final.reply).filter((n) => !allowed.some((a) => Math.abs(a - n) < 0.005));
    if (loose.length) {
      rules[4].push(`The reply mentions numbers that are not in the question or in any tool result: ${[...new Set(loose)].join(", ")}.`);
    }
  }

  // Rule 5: only real tools, each used once, and every reply readable.
  for (const s of toolSteps) {
    if (!Object.hasOwn(TOOLS, s.tool)) rules[5].push(`The agent called a tool that does not exist (${s.tool}).`);
  }
  for (const name of Object.keys(TOOLS)) {
    if (toolSteps.filter((s) => s.tool === name).length > 1) rules[5].push(`The agent called ${name} more than once.`);
  }
  const unreadable = run.steps.filter((s) => s.kind === "invalid").length;
  if (unreadable) rules[5].push(`${unreadable} ${unreadable === 1 ? "reply was" : "replies were"} not readable as a step.`);

  // Output guardrails run on the final answer the model gave. A failure is a problem for this try,
  // so retry, fallback and refuse apply. They read the question's amount, never an answer key.
  if (final) {
    const out = checkOutput({ final, toolOutputs: toolSteps.map((s) => s.output), amount: c.amount ?? null });
    if (!out.ok) rules[6].push(`Output guardrail: ${out.reason}`);
  }

  return { rules, classify, rank, top };
}

// One entry per checker rule, in plain words, so a flow graph can light each check separately.
const CHECK_LABELS = [
  [1, "tool1", "Merchant looked up"],
  [2, "tool2", "Cards ranked for the right amount and category"],
  [3, "answer", "Final card and reward match the top ranked card"],
  [4, "numbers", "Every number comes from a tool or the question"],
  [5, "extras", "No unknown, repeated tool or unreadable reply"],
  [6, "output", "Output guardrails passed"],
];

function verdictOf(rules) {
  const problems = Object.values(rules).flat();
  const checks = CHECK_LABELS.map(([n, id, label]) => ({ id, ok: rules[n].length === 0, label }));
  return { ok: problems.length === 0, problems, checks };
}

export function verifyRun(c, run) {
  return verdictOf(checkRules(c, run).rules);
}

const withFinal = (run, final) => ({
  ...run,
  steps: [...run.steps.filter((s) => s.kind !== "final"), final],
});

function fallbackFinal(checked) {
  const { classify, rank, top } = checked;
  const amount = Number(rank.args.amount);
  const reply =
    `Use ${CARDS[top.card].name} for ${classify.args.merchant}. ` +
    `It returns ${top.rate_pct}% on ${classify.output.category}, so you earn ₹${top.reward_inr} on ₹${amount}.`;
  const final = { card: top.card, reward_inr: top.reward_inr, reply };
  return { kind: "final", ...final, raw: JSON.stringify({ final }), ms: 0, tokens: 0, validJson: true, source: "fallback" };
}

function refusedFinal() {
  const final = { card: null, reward_inr: null, reply: REFUSAL_REPLY };
  return { kind: "final", ...final, raw: JSON.stringify({ final }), ms: 0, tokens: 0, validJson: true, source: "refused" };
}

// chat: same contract as runCase. Returns { run, attempts, outcome, events }.
// outcome 'blocked': the input guardrail stopped the question. No model call, run.steps is [], attempts is one empty try.
export async function runGuarded(chat, c, opts = {}) {
  const { model, seed = 42, temperature = 0.2, maxAttempts = 3, onEvent, onStep } = opts;
  const events = [];
  const emit = (t, attempt, text, extra = {}) => {
    const event = { t, attempt, text, ...extra };
    events.push(event);
    onEvent?.(event);
  };
  // Input guardrails run before any model call. A blocked question never reaches the model.
  const input = checkInput(c.query);
  if (!input.ok) {
    emit("guard_in_fail", 0, input.reason, { rule: input.rule });
    const run = { caseId: c.id, model, temperature, seed, steps: [], totalMs: 0, totalTokens: 0, attemptCount: 0, source: "blocked" };
    return { run, attempts: [{ run, verdict: null }], outcome: "blocked", events, blocked: { rule: input.rule, reason: input.reason } };
  }
  emit("guard_in_ok", 0, `Input guardrails passed: ${INPUT_RULES.length} rules`);

  const attempts = [];
  const checks = [];
  let accepted = -1;

  for (let k = 0; k < maxAttempts; k++) {
    emit("attempt_start", k, `Starting attempt ${k + 1} of ${maxAttempts}.`);
    const run = await runCase(chat, c, {
      model, seed: seed + k * 100, temperature, constrain: true,
      onStep: (steps) => onStep?.(steps, k),
    });
    const checked = checkRules(c, run);
    const verdict = verdictOf(checked.rules);
    attempts.push({ run, verdict });
    checks.push(checked);
    if (verdict.ok) {
      emit("verify_ok", k, "Checker found no problems.");
      accepted = k;
      break;
    }
    const n = verdict.problems.length;
    emit("verify_fail", k, `Checker found ${n} ${n === 1 ? "problem" : "problems"}: ${verdict.problems.join(" ")}`);
    if (k < maxAttempts - 1) emit("retry", k, `Trying again (attempt ${k + 2} of ${maxAttempts}).`);
  }

  let chosen;
  let outcome;
  if (accepted >= 0) {
    chosen = attempts[accepted].run;
    outcome = accepted === 0 ? "passed_first_try" : "passed_after_retry";
  } else {
    // Prefer the last attempt whose tools ran correctly (rules 1 and 2 hold).
    let usable = -1;
    for (let k = attempts.length - 1; k >= 0; k--) {
      const { rules } = checks[k];
      if (!rules[1].length && !rules[2].length) { usable = k; break; }
    }
    const last = attempts.length - 1;
    if (usable >= 0) {
      chosen = withFinal(attempts[usable].run, fallbackFinal(checks[usable]));
      outcome = "fixed_by_fallback";
      emit("fallback", last, "All tries failed the checker, but the tools ran correctly, so the answer is built from the rank_cards result.");
    } else {
      chosen = withFinal(attempts[last].run, refusedFinal());
      outcome = "refused";
      emit("refused", last, "The tools never ran correctly, so there is nothing to build an answer from. Refusing instead of guessing.");
    }
  }

  const run = {
    ...chosen,
    totalMs: attempts.reduce((sum, a) => sum + a.run.totalMs, 0),
    totalTokens: attempts.reduce((sum, a) => sum + a.run.totalTokens, 0),
    attemptCount: attempts.length,
  };
  return { run, attempts, outcome, events };
}

// Replays recorded runs without a model. The caller passes a list of recorded runs for the SAME case,
// rotated to start at the chosen index. A call with exactly 2 messages (system + user) starts the next
// run in the list, so attempt 1 uses runs[0], attempt 2 uses runs[1], and so on.
export function makeReplayChat(runs) {
  let runIndex = -1;
  let stepIndex = 0;
  return async function chat({ messages }) {
    if (messages.length === 2) { runIndex += 1; stepIndex = 0; }
    const step = runs[runIndex]?.steps[stepIndex];
    stepIndex += 1;
    return step ? { text: step.raw, tokens: step.tokens, ms: step.ms } : { text: "{}", tokens: 0, ms: 0 };
  };
}
