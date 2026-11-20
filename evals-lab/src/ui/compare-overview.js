// The hero visual on Side by side: two lanes that show what each agent does, with a result badge at the end of each.
// Pure strings, no DOM. Exports: LANES, overviewHtml, resultWord, nowStep.
// Each step is a button. The node ids are wiring-graph.js ids, so a click opens the same explain pop-up as the wiring graph.
import { nodeIconHtml } from "./node-visuals.js";

const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );

// Labels are at most two words. `c3` is the "Check the answer" node of the wiring graph.
export const LANES = {
  simple: {
    title: "Agent without evals",
    steps: [
      { id: "ask", label: "Question" },
      { id: "model", label: "Model" },
      { id: "answer", label: "Answer" },
    ],
  },
  careful: {
    title: "Agent with evals",
    steps: [
      { id: "ask", label: "Question" },
      { id: "guard", label: "Guardrail" },
      { id: "model", label: "Model" },
      { id: "c3", label: "Checker", branch: "wrong? retry, then fallback" },
      { id: "answer", label: "Answer" },
    ],
  },
};

// Badge words and the square shape that goes with each (filled = right, hollow = wrong, half = not a right or wrong answer).
const BADGE = {
  RIGHT: ["ok", "is-right"],
  WRONG: ["bad", "is-wrong"],
  BLOCKED: ["half", "is-blocked"],
  "NO ANSWER": ["half", "is-blocked"],
  "NO KEY": ["half", "is-blocked"],
  "NOT RUN": ["half", "is-blocked"],
};

// The word at the end of a lane, read from one side of state.cmp (see compare-screen.js). null = no result to show yet.
export function resultWord(side) {
  if (!side || side.pending) return null;
  if (side.outcome === "blocked") return "BLOCKED";
  if (side.note) return "NOT RUN"; // the agent without evals cannot run a typed question on recorded runs
  if (!side.scores) return null;
  if (side.outcome === "refused") return "NO ANSWER";
  const pass = side.scores.task_success?.pass;
  return pass === true ? "RIGHT" : pass === false ? "WRONG" : "NO KEY";
}

// The step to mark NOW while a run is going: from the wiring states of the lane (wiring-graph.js wiringStates).
// While the run is going, something is always being worked on, and the model is the default.
export function nowStep(kind, states = {}, pending = false) {
  if (!pending) return null;
  const active = (id) => states[id] === "active";
  if (kind === "careful" && (active("c1") || active("c2") || active("c3"))) return "c3";
  return "model";
}

function stepHtml(kind, step, index, now) {
  const arrow = index > 0 ? `<span class="ov-arrow" aria-hidden="true">\u2192</span>` : "";
  const isNow = now === step.id;
  const branch = step.branch ? `<span class="ov-branch">${esc(step.branch)}</span>` : "";
  const aria = `${step.label}${isNow ? ", running now" : ""}. Open the explanation.`;
  return (
    `<li class="ov-step${isNow ? " is-now" : ""}">${arrow}` +
    `<span class="ov-cell"><button type="button" class="ov-node" data-ov-kind="${esc(kind)}" data-ov-node="${esc(step.id)}" aria-label="${esc(aria)}">` +
    `<span class="ov-icon" aria-hidden="true">${nodeIconHtml(step.id)}</span><span class="ov-label">${esc(step.label)}</span></button>` +
    (isNow ? `<b class="ov-now">NOW</b>` : "") +
    branch +
    `</span></li>`
  );
}

function resultHtml(word) {
  if (!word) return `<p class="ov-result is-idle">Result: <span>not run yet</span></p>`;
  const [sq, cls] = BADGE[word] ?? ["half", "is-blocked"];
  return `<p class="ov-result">Result: <b class="ov-badge ${cls}"><i class="sq ${sq}" aria-hidden="true"></i>${esc(word)}</b></p>`;
}

// now: { simple, careful } step ids or null. result: { simple, careful } badge words (from resultWord) or null.
export function overviewHtml({ now = {}, result = {} } = {}) {
  const lane = (kind) => {
    const { title, steps } = LANES[kind];
    return (
      `<section class="ov-lane ov-${kind}" aria-label="${esc(title)}">` +
      `<h3 class="ov-title">${esc(title)}</h3>` +
      `<ol class="ov-steps">${steps.map((s, i) => stepHtml(kind, s, i, now[kind])).join("")}</ol>` +
      resultHtml(result[kind]) +
      `</section>`
    );
  };
  return `<div class="ov" role="group" aria-label="What each agent does">${lane("simple")}${lane("careful")}</div>`;
}
