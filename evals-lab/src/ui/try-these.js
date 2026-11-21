// The quick-start chips on Side by side ("Try these"): three buttons that each load a recorded run with a known result.
// Exports: TRY_THESE, NOT_LOADED, LOADING, DEMO_NOTE, questionLabel, tryTheseHtml. Pure strings, no DOM.
// `outcome` is shown under the title, so it must stay true for data/recorded-runs.json.
// tests/ui/try-these.test.mjs replays each (caseId, seed) pair and fails if the words stop being true.
import { CASES } from "../task/cases.js";

export const TRY_THESE = [
  {
    id: "wrong-card",
    label: "WRONG CARD",
    caseId: "C03",
    seed: 3,
    outcome: "Without evals: picks the wrong card. With evals: the checker catches it, right after a retry.",
  },
  {
    id: "no-answer",
    label: "NO ANSWER",
    caseId: "C06",
    seed: 1,
    outcome: "Without evals: no answer, a tool call fails. With evals: right after a retry.",
  },
  {
    id: "safety-net",
    label: "SAFETY NET",
    caseId: "C03",
    seed: 2,
    outcome: "Without evals: picks the wrong card. With evals: retries fail, the fallback gives the right card.",
  },
];

// These are recorded demos by design: their results are asserted against data/recorded-runs.json.
// With the live AI chosen they still work: a click switches to recorded runs.
export const DEMO_NOTE = "These are recorded demos. A click switches to recorded runs.";
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

// disabledReason: "" when the chips work, else the words to show (the chips are disabled and say why).
// recordedDemo: the live AI is chosen, so say that a click switches to recorded runs.
// Each chip is a short title plus a one-line caption that says the result you will see. No question text: the chat shows it.
export function tryTheseHtml({ disabledReason = "", recordedDemo = false } = {}) {
  const buttons = TRY_THESE.map(
    (t) =>
      `<button type="button" class="sec try-btn" data-try="${esc(t.id)}"${disabledReason ? " disabled" : ""}>` +
      `<span class="try-title">${esc(t.label)}</span>` +
      `<span class="try-out">${esc(t.outcome)}</span>` +
      (disabledReason ? `<span class="try-why">${esc(disabledReason)}</span>` : "") +
      `</button>`,
  ).join("");
  const note = disabledReason ? `${disabledReason}.` : recordedDemo ? DEMO_NOTE : "";
  return (
    `<div class="try-these" role="group" aria-label="Quick start">` +
    `<p class="k">Or quick start</p><div class="try-row">${buttons}</div>` +
    (note ? `<p class="muted try-note">${esc(note)}</p>` : "") +
    `</div>`
  );
}
