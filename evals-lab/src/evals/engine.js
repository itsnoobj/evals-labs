// Scoring engine for the Evals Lab. Pure functions, no DOM, runs in browser and node.
// Contract: docs/specs/engine-contract.md
import { CARDS } from "../task/cases.js";

export const METRICS = [
  { id: "trajectory", label: "Right tools, right order", group: "TOOL CHOICE", blurb: "Did the agent call the expected tools, with the expected inputs, in order?" },
  { id: "task_success", label: "Correct final answer", group: "RESULT", blurb: "Are the final card and reward the correct answer?" },
  { id: "answer_match", label: "Names the right card", group: "REPLY TEXT", blurb: "Does the reply sentence name the right card?" },
  { id: "grounded", label: "Numbers come from tools", group: "NO MADE-UP NUMBERS", blurb: "Does every number in the answer come from a tool result or the question?" },
  { id: "tool_recall", label: "Used every needed tool", group: "TOOL CHOICE", blurb: "Were all the needed tools called at least once?" },
  { id: "tool_precision", label: "No extra tool calls", group: "TOOL CHOICE", blurb: "Did the agent avoid extra, repeated or unknown tool calls?" },
  { id: "rubric_judge", label: "AI grader", group: "SECOND OPINION", blurb: "A second AI grades the reply from 0 to 5 for relevance, honesty about numbers and clarity." },
  { id: "ops", label: "Speed and clean output", group: "SPEED", blurb: "Was the run fast enough, and was every reply readable by our code?" },
];

const MAX_TOTAL_MS = 20000;
// Matches 2250, 2,250, 1,50,000 and 1.5. Grouped commas need 2-3 digits so "5, 6" stays two numbers.
const NUMBER_PATTERN = /\d+(?:,\d{2,3})*(?:\.\d+)?/g;

const toolSteps = (run) => run.steps.filter((s) => s.kind === "tool");
const finalStep = (run) => run.steps.findLast((s) => s.kind === "final");
const numbersIn = (text) => (String(text).match(NUMBER_PATTERN) ?? []).map((t) => Number(t.replace(/,/g, "")));
const share = (n, d) => (d === 0 ? 1 : n / d);

// Sorted keys so {a,b} and {b,a} compare equal.
function sameArgs(a, b) {
  const sort = (_, v) => (v && typeof v === "object" && !Array.isArray(v)
    ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, v[k]]))
    : v);
  return JSON.stringify(a, sort) === JSON.stringify(b, sort);
}

const stepMatches = (step, expected) =>
  !!expected && step.tool === expected.tool && sameArgs(step.args, expected.args);

// Ties: every card with the top reward is a correct answer. Old-shape cases only have `card`.
const acceptOf = (c) => c.expected.accept ?? [c.expected.card];
const orList = (ids) => ids.join(" or ");

function finalIsCorrect(c, final) {
  return !!final && acceptOf(c).includes(final.card)
    && typeof final.reward_inr === "number"
    && Math.abs(final.reward_inr - c.expected.reward_inr) <= 0.5;
}

function groundedNumbers(c, run) {
  // A typed question has no parsed-amount guarantee, so every number in its text counts as given.
  const allowed = [c.amount, ...(hasAnswerKey(c) ? [] : numbersIn(c.query ?? ""))].filter((n) => typeof n === "number");
  for (const step of toolSteps(run)) {
    for (const row of step.output?.ranked ?? []) allowed.push(row.rate_pct, row.reward_inr);
  }
  return allowed;
}

const verdict = (pass, score, reason) => ({ pass, score, reason });

const metricRules = {
  trajectory(c, run) {
    const steps = toolSteps(run);
    const hits = steps.filter((s, i) => stepMatches(s, c.expectedTrajectory[i])).length;
    const score = hits / Math.max(c.expectedTrajectory.length, steps.length);
    return verdict(score === 1, score, `${hits} of ${Math.max(c.expectedTrajectory.length, steps.length)} tool steps match`);
  },

  task_success(c, run) {
    const final = finalStep(run);
    if (!final) return verdict(false, 0, "no final answer");
    const ok = finalIsCorrect(c, final);
    return verdict(ok, ok ? 1 : 0, `got ${final.card} / ${final.reward_inr}, accepted: ${orList(acceptOf(c))} (reward ${c.expected.reward_inr})`);
  },

  answer_match(c, run) {
    const final = finalStep(run);
    if (!final) return verdict(false, 0, "no final answer");
    // "IDFC First Power+" and "IDFC First Power Plus" are the same card, so compare plain words.
    const plain = (t) => ` ${String(t).toLowerCase().replace(/\+/g, " plus ").replace(/[^a-z0-9]+/g, " ").trim()} `;
    const reply = plain(final.reply ?? "");
    const accepted = acceptOf(c);
    const named = accepted.find((id) => reply.includes(plain(CARDS[id].name)) || reply.includes(plain(id)));
    const ok = named !== undefined;
    return verdict(ok, ok ? 1 : 0, ok ? `reply names ${CARDS[named].name}` : `reply names none of the accepted cards, accepted: ${orList(accepted.map((id) => CARDS[id].name))}`);
  },

  grounded(c, run) {
    const final = finalStep(run);
    if (!final) return verdict(false, 0, "no final answer");
    const allowed = groundedNumbers(c, run);
    const claimed = [...numbersIn(final.reply ?? ""), ...(typeof final.reward_inr === "number" ? [final.reward_inr] : [])];
    const loose = claimed.filter((n) => !allowed.some((a) => Math.abs(a - n) < 0.005));
    const ok = loose.length === 0;
    return verdict(ok, ok ? 1 : 0, ok ? "every number is in a tool output or the question" : `not in any tool output: ${[...new Set(loose)].join(", ")}`);
  },

  tool_recall(c, run) {
    const called = new Set(toolSteps(run).map((s) => s.tool));
    const needed = [...new Set(c.expectedTrajectory.map((s) => s.tool))];
    const missing = needed.filter((t) => !called.has(t));
    const score = share(needed.length - missing.length, needed.length);
    return verdict(missing.length === 0, score, missing.length ? `missing: ${missing.join(", ")}` : "all needed tools called");
  },

  tool_precision(c, run) {
    const steps = toolSteps(run);
    // Each expected tool can be matched once, so repeats and unknown tools count as extra.
    const unmatched = c.expectedTrajectory.map((s) => s.tool);
    let matched = 0;
    for (const step of steps) {
      const at = unmatched.indexOf(step.tool);
      if (at !== -1) { unmatched.splice(at, 1); matched += 1; }
    }
    const extra = steps.length - matched;
    return verdict(extra === 0, share(matched, steps.length), extra ? `${extra} extra tool step(s)` : "no extra tool steps");
  },

  rubric_judge(c, run, opts) {
    const score = opts.judge?.score;
    if (typeof score !== "number") return verdict(null, null, "not run");
    return verdict(score >= 4, score, `the AI grader gave ${score} of 5`);
  },

  ops(c, run) {
    const broken = run.steps.filter((s) => s.validJson === false).length;
    const ok = run.totalMs <= MAX_TOTAL_MS && broken === 0;
    const reason = `${run.totalMs} ms, ${run.totalTokens} text pieces` + (broken ? `, ${broken} unreadable reply step(s)` : "");
    return verdict(ok, ok ? 1 : 0, reason);
  },
};

// A question the user typed has no answer key (expected and expectedTrajectory are null).
const NEEDS_KEY = new Set(["trajectory", "task_success", "answer_match", "tool_recall", "tool_precision"]);
export const hasAnswerKey = (c) => c.expected != null && c.expectedTrajectory != null;

export function scoreRun(c, run, opts = {}) {
  return Object.fromEntries(METRICS.map(({ id }) => [
    id,
    NEEDS_KEY.has(id) && !hasAnswerKey(c)
      ? verdict(null, null, "no answer key for your own question")
      : metricRules[id](c, run, opts),
  ]));
}

export const BUGS = [
  { id: "wrong_number_in_reply", label: "Wrong number in reply", blurb: "The reward amount is 10x too big, in the answer and in the reply text." },
  { id: "skip_tool", label: "Skip a tool", blurb: "The agent never classifies the merchant." },
  { id: "duplicate_call", label: "Duplicate call", blurb: "The agent ranks the cards twice." },
  { id: "invented_tool", label: "Invented tool", blurb: "The agent calls a tool that does not exist." },
  { id: "right_words_wrong_card", label: "Right words, wrong card", blurb: "The reply names the right card but the final answer picks another." },
];

function recomputeTotals(run) {
  run.totalMs = run.steps.reduce((sum, s) => sum + s.ms, 0);
  run.totalTokens = run.steps.reduce((sum, s) => sum + s.tokens, 0);
}

const bugRules = {
  wrong_number_in_reply(c, run) {
    const final = finalStep(run);
    if (typeof final?.reward_inr !== "number") throw new Error("this run has no reward number to change");
    const was = final.reward_inr;
    // 10x, but never land on the question's own amount (Rs 80 x 10 = Rs 800 would look grounded).
    const factor = was * 10 === c.amount ? 100 : 10;
    const now = Math.round(was * factor * 100) / 100;
    final.reward_inr = now;
    final.reply = final.reply.replace(NUMBER_PATTERN, (t) => (Number(t.replace(/,/g, "")) === was ? String(now) : t));
  },
  skip_tool(c, run) {
    run.steps = run.steps.filter((s) => s.tool !== "classify_merchant");
  },
  duplicate_call(c, run) {
    const at = run.steps.findIndex((s) => s.tool === "rank_cards");
    if (at === -1) throw new Error("this run never ranked the cards, so there is no call to repeat");
    run.steps.splice(at + 1, 0, structuredClone(run.steps[at]));
  },
  invented_tool(c, run) {
    const tool = "check_credit_limit";
    const at = run.steps.findIndex((s) => s.kind === "final");
    const args = {};
    run.steps.splice(at, 0, {
      kind: "tool", tool, args, output: { error: `unknown tool: ${tool}` },
      raw: JSON.stringify({ tool, args }), ms: 300, tokens: 30, validJson: true,
    });
  },
  right_words_wrong_card(c, run) {
    if (!hasAnswerKey(c)) throw new Error("your own question has no correct card to swap away from");
    const final = finalStep(run);
    if (!final) throw new Error("this run has no final answer to change");
    const accepted = acceptOf(c);
    final.card = Object.keys(CARDS).find((id) => !accepted.includes(id));
  },
};

export function injectBug(c, run, bugId) {
  if (!Object.hasOwn(bugRules, bugId)) throw new Error(`unknown bug: ${bugId}`);
  const copy = structuredClone(run);
  bugRules[bugId](c, copy);
  recomputeTotals(copy);
  copy.model = `injected:${bugId}`;
  return copy;
}

export function summarizeGrid(results) {
  const nRuns = results.reduce((sum, r) => sum + r.runs.length, 0);
  const passes = results.reduce((sum, r) => sum + r.runs.filter(Boolean).length, 0);
  return {
    nCases: results.length,
    nRuns,
    avg: nRuns === 0 ? 0 : passes / nRuns,
    allPass: results.filter((r) => r.runs.length > 0 && r.runs.every(Boolean)).length,
    anyPass: results.filter((r) => r.runs.some(Boolean)).length,
  };
}

// A run has expectedTrajectory.length tool steps plus one final step. Steps the run skipped still
// count in the denominator, otherwise dropping a step would raise accuracy.
// One boolean per step, in run order. Tool steps are compared with the expected step at the same tool index.
export function stepCorrectness(c, run) {
  let toolIndex = 0;
  return run.steps.map((step) => {
    if (step.kind === "tool") return stepMatches(step, c.expectedTrajectory[toolIndex++]);
    return step.kind === "final" && finalIsCorrect(c, step);
  });
}

export function perStepAccuracy(runs, cases) {
  const byId = Object.fromEntries(cases.map((c) => [c.id, c]));
  let correct = 0;
  let total = 0;
  for (const run of runs) {
    const c = byId[run.caseId];
    if (!c || !hasAnswerKey(c)) continue;
    correct += stepCorrectness(c, run).filter(Boolean).length;
    total += Math.max(run.steps.length, c.expectedTrajectory.length + 1);
  }
  return total === 0 ? 0 : correct / total;
}

export const chainSuccess = (p, n) => p ** n;
export const retryLift = (p, tries) => 1 - (1 - p) ** tries;

// The prompt carries no expected answer, so the judge cannot just compare to it.
export function judgePrompt(c, run) {
  const final = finalStep(run);
  const toolResults = toolSteps(run).map((s) => `${s.tool}: ${JSON.stringify(s.output)}`).join("\n") || "(no tool calls)";
  return {
    system:
      "You are a strict grader of a credit card assistant. Grade the reply on three things:\n" +
      "- relevance: it answers the user's question.\n" +
      "- groundedness: every number comes from the tool results or the question.\n" +
      "- clarity: it is short and easy to follow.\n" +
      "Answer with a single integer from 0 (bad) to 5 (excellent) and nothing else.",
    user:
      `Question: ${c.query}\n\nTool results:\n${toolResults}\n\nReply:\n${final?.reply ?? "(no reply)"}\n\nScore (0-5):`,
  };
}

export function parseJudge(text) {
  // Lookarounds skip digits inside larger numbers such as 15, and the decimal part of 3.5.
  const match = /(?<![\d.])([0-5])(?!\d)/.exec(String(text ?? ""));
  return { score: match ? Number(match[1]) : null };
}
