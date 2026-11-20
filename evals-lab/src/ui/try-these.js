// The "Try these" row on Side by side: two buttons that each load a recorded run with a known result.
// Exports: TRY_THESE, LIVE_ONLY, NOT_LOADED, LOADING, questionLabel, tryTheseHtml. Pure strings, no DOM.
// `outcome` is shown under the title, so it must stay true for data/recorded-runs.json.
// tests/ui/try-these.test.mjs replays each (caseId, seed) pair and fails if the words stop being true.
import { CASES } from "../task/cases.js";

export const TRY_THESE = [
  {
    id: "gap",
    label: "SEE THE GAP",
    caseId: "C05",
    seed: 0,
    outcome: "Agent without evals: wrong. Agent with evals: right on the first try.",
  },
  {
    id: "retry",
    label: "SEE A RETRY",
    caseId: "C01",
    seed: 1,
    outcome: "Agent with evals: wrong first, right after a retry.",
  },
];

export const LIVE_ONLY = "Recorded runs only";
export const NOT_LOADED = "Recorded runs did not load";
export const LOADING = "Wait until the model finishes loading";

const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );

// Plain words for the question: merchant and amount, read from CASES.
export function questionLabel(caseId) {
  const c = CASES.find((x) => x.id === caseId);
  if (!c) throw new Error(`unknown case ${caseId}`);
  return `${c.merchant}, ₹${c.amount.toLocaleString("en-IN")}`;
}

// disabledReason: "" when the buttons work, else the words to show (the buttons are disabled and say why).
export function tryTheseHtml({ disabledReason = "" } = {}) {
  const buttons = TRY_THESE.map(
    (t) =>
      `<button type="button" class="sec try-btn" data-try="${esc(t.id)}"${disabledReason ? " disabled" : ""}>` +
      `<span class="try-title">${esc(t.label)}: ${esc(questionLabel(t.caseId))}</span>` +
      `<span class="try-out">${esc(t.outcome)}</span>` +
      (disabledReason ? `<span class="try-why">${esc(disabledReason)}</span>` : "") +
      `</button>`,
  ).join("");
  const note = !disabledReason
    ? "These use recorded runs, so you see the same result every time."
    : disabledReason === LIVE_ONLY
      ? `${LIVE_ONLY}. The live model is active. Press Use recorded runs above to switch.`
      : `${disabledReason}.`;
  return (
    `<div class="try-these" role="group" aria-label="Try these">` +
    `<p class="k">Try these</p><div class="try-row">${buttons}</div>` +
    `<p class="muted try-note">${esc(note)}</p></div>`
  );
}
