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
export const NEEDS_LIVE_NOTE =
  'Typed questions need the live model. Press "Use the live AI" under the question box, or pick a test question.';
export const SIMPLE_NEEDS_LIVE_NOTE =
  'Typed questions need the live AI for the agent without evals. Press "Use the live AI" under the question box.';
export const NO_KEY_NOTE = "Your own question has no answer key, so nothing is marked right or wrong.";
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const describeError = (err) => err?.message ?? (typeof err === "string" ? err : JSON.stringify(err));

export const CARD_NAMES = Object.fromEntries(Object.entries(CARDS).map(([id, c]) => [id, c.name]));

// mode: what is running now. "none" until a way to run is ready; "live" only once the model is loaded; "replay" = recorded runs.
// pref: what is chosen. "live" = live AI chosen but not loaded yet (the first ask loads it), "replay", "failed" (the load
// failed, nothing else chosen yet), "" = not decided yet. demo: a Try these button switched to recorded runs.
// loadError: why the last load failed. fallbackReason: why recorded runs were the default.
// done: mission task ids the visitor has completed (see lessons.js MISSIONS).
export const state = {
  mode: "none",
  pref: "",
  demo: false,
  loadError: "",
  fallbackReason: "",
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
  cmpBusy: false,
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
