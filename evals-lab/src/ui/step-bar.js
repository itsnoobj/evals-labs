// The step bar in the header of each agent column on Side by side: small labelled squares joined by arrows,
// each with its state as text (waiting / NOW / done / FAILED / skipped / blocked), and a result badge at the end.
// Pure strings, no DOM. Exports: STEPS, stepState, stepBarHtml, resultWord, nowStep.
// Each step is a button. The ids are wiring-graph.js node ids, so a click opens the same explain pop-up as the wiring graph.
import { nodeIconHtml } from "./node-visuals.js";

const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );

// Labels are at most two words. `c3` is the "Check the answer" node of the wiring graph.
// The labels Guardrail, Checker, Retry and Fallback are also the names printed in the chat (chat-ui.js).
export const STEPS = {
  simple: [
    { id: "ask", label: "Question" },
    { id: "model", label: "Model" },
    { id: "answer", label: "Answer" },
  ],
  careful: [
    { id: "ask", label: "Question" },
    { id: "guard", label: "Guardrail" },
    { id: "model", label: "Model" },
    { id: "c3", label: "Checker", branch: "wrong? retry, then fallback" },
    { id: "answer", label: "Answer" },
  ],
};
const TITLES = { simple: "Agent without evals", careful: "Agent with evals" };

// State word -> the square that goes with it (filled = good, hollow with a red edge = bad, half = in progress, plain = not yet).
const STATE_SQ = { done: "ok", FAILED: "bad", blocked: "bad", NOW: "half", waiting: "", skipped: "" };

// The state of one step, as one of the six words. `states` are the wiring states of the agent (wiring-graph.js wiringStates).
// `skipped` = the agent did not run at all (a typed question on recorded runs, for the agent without evals).
export function stepState(id, { states = {}, now = null, skipped = false } = {}) {
  if (skipped) return "skipped";
  if (now === id) return "NOW";
  const blocked = states.guard === "blocked";
  if (blocked) return id === "ask" ? "done" : id === "guard" ? "blocked" : "skipped";
  switch (states[id]) {
    case "active":
      return "NOW";
    case "done":
    case "pass":
    case "used":
      return "done";
    case "fail":
      return "FAILED";
    case "blocked":
      return "blocked";
    case "skipped":
    case "missing":
      return "skipped";
    default:
      return "waiting";
  }
}

// Badge words and the square shape that goes with each (filled = right, hollow = wrong, half = not a right or wrong answer).
const BADGE = {
  RIGHT: ["ok", "is-right"],
  WRONG: ["bad", "is-wrong"],
  BLOCKED: ["half", "is-blocked"],
  "NO ANSWER": ["half", "is-blocked"],
  "NO KEY": ["half", "is-blocked"],
  "NOT RUN": ["half", "is-blocked"],
};

// The badge word of one side of state.cmp (see compare-screen.js). null = no result to show yet.
export function resultWord(side) {
  if (!side || side.pending) return null;
  if (side.outcome === "blocked") return "BLOCKED";
  if (side.note) return "NOT RUN"; // the agent without evals cannot run a typed question on recorded runs
  if (!side.scores) return null;
  if (side.outcome === "refused") return "NO ANSWER";
  const pass = side.scores.task_success?.pass;
  return pass === true ? "RIGHT" : pass === false ? "WRONG" : "NO KEY";
}

// The step to mark NOW while a run is going: from the wiring states of the agent.
// While the run is going, something is always being worked on, and the model is the default.
export function nowStep(kind, states = {}, pending = false) {
  if (!pending) return null;
  const active = (id) => states[id] === "active";
  if (kind === "careful" && (active("c1") || active("c2") || active("c3"))) return "c3";
  return "model";
}

function stepHtml(kind, step, index, ctx) {
  const state = stepState(step.id, ctx);
  const arrow = index > 0 ? `<span class="sb-arrow" aria-hidden="true">\u2192</span>` : "";
  const notes = [];
  if (step.id === "c3" && ctx.retries > 0) notes.push(`<span class="sb-note">retry ${esc(ctx.retries)}</span>`);
  if (step.id === "c3" && ctx.fallback) notes.push(`<span class="sb-note">fallback</span>`);
  const branch = step.branch ? `<span class="sb-branch">${esc(step.branch)}</span>` : "";
  const aria = `${step.label}, ${state}. Open the explanation.`;
  return (
    `<li class="sb-step is-${state.toLowerCase()}">${arrow}<span class="sb-cell">` +
    `<button type="button" class="sb-node" data-sb-kind="${esc(kind)}" data-sb-node="${esc(step.id)}" aria-label="${esc(aria)}">` +
    `<span class="sb-sq" aria-hidden="true">${nodeIconHtml(step.id)}</span><span class="sb-label">${esc(step.label)}</span></button>` +
    `<span class="sb-state"><i class="sq ${STATE_SQ[state]}" aria-hidden="true"></i>${state === "NOW" ? "<b>NOW</b>" : state}</span>` +
    notes.join("") +
    branch +
    `</span></li>`
  );
}

function resultHtml(word, running) {
  if (!word) return `<p class="sb-result is-idle">Result: <span>${running ? "running" : "not run yet"}</span></p>`;
  const [sq, cls] = BADGE[word] ?? ["half", "is-blocked"];
  return `<p class="sb-result">Result: <b class="sb-badge ${cls}"><i class="sq ${sq}" aria-hidden="true"></i>${esc(word)}</b></p>`;
}

// kind: "simple" | "careful". states: wiring states of that agent. now: step id or null.
// result: badge word (from resultWord) or null. retries: number of retries so far. fallback: the answer was built by the fallback.
export function stepBarHtml({
  kind = "simple",
  states = {},
  now = null,
  result = null,
  retries = 0,
  fallback = false,
  skipped = false,
  running = false,
} = {}) {
  const steps = STEPS[kind] ?? STEPS.simple;
  const ctx = { states, now, retries, fallback, skipped };
  return (
    `<div class="stepbar sb-${kind}" role="group" aria-label="${esc(TITLES[kind])}: steps">` +
    `<ol class="sb-steps">${steps.map((s, i) => stepHtml(kind, s, i, ctx)).join("")}</ol>` +
    resultHtml(result, running) +
    `</div>`
  );
}
