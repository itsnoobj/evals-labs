// Shared by every screen: the one `state` object, the `$` element lookup, question helpers, notes, and small utilities.
// Exports: $, caseById, questionFor, state, mark, showError, describeError, sleep, expectedOf, CARD_NAMES, and the note strings.
import { CASES, CARDS } from "../task/cases.js";
import * as ui from "../ui/ui.js";
import { makeCustomCase } from "../task/custom-question.js";

export const $ = (id) => document.getElementById(id);
export const caseById = (id) => CASES.find((c) => c.id === id);
// A typed question wins over the list. Clearing the text box returns to the list.
export const questionFor = (selectId, textId) => {
  const text = $(textId).value.trim();
  return text ? makeCustomCase(text) : caseById($(selectId).value);
};
export const NEEDS_LIVE_NOTE = "Typed questions need the live model. Press Load model above, or pick a test question.";
export const SIMPLE_NEEDS_LIVE_NOTE =
  "Typed questions need the live model for the agent without evals. Load the model above.";
export const NO_KEY_NOTE = "Your own question has no answer key, so nothing is marked right or wrong.";
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const describeError = (err) => err?.message ?? (typeof err === "string" ? err : JSON.stringify(err));

export const CARD_NAMES = Object.fromEntries(Object.entries(CARDS).map(([id, c]) => [id, c.name]));

// mode: "none" until the visitor loads the model ("live") or picks the recorded runs ("replay").
// done: mission task ids the visitor has completed (see lessons.js MISSIONS).
export const state = {
  mode: "none",
  llm: null,
  gpuCheck: null,
  gpu: null,
  recorded: null,
  last: null,
  bugId: null,
  judge: null,
  metricsCtx: null,
  gridRuns: [],
  cellRuns: {},
  grid: null,
  cell: null,
  stop: false,
  whatIf: null,
  done: new Set(),
  bugsTried: new Set(),
  cmp: null,
  cmpLastCase: null,
  dspy: null,
  promptTab: "ours",
};

export function mark(taskId) {
  if (state.done.has(taskId)) return;
  state.done.add(taskId);
  ui.renderMissions(state.done);
}

export function showError(root, err) {
  const p = document.createElement("p");
  p.className = "err";
  p.textContent = `Something went wrong: ${describeError(err)}`;
  root.replaceChildren(p);
}

// accept lists every card tied for the top reward, so a tie counts as right whichever tied card the agent names.
export const expectedOf = (c) =>
  c.expected ? { card: c.expected.card, accept: c.expected.accept, reward_inr: c.expected.reward_inr } : null;
