// Screen 6, "LLM judge lab (coming soon)": a short page that says what the lab will do and that it is not built.
// Pure string, no DOM. main.js puts it into #judge-soon; nav.js shows the section. Styles: styles/judge-soon.css.
// Nothing here is interactive except one link to the Checks screen. No figures are made up: the "Why" sentence is the
// one on the Checks screen (check-details.js), and tests/ui/judge-lab-soon.test.mjs checks that they match.
import { nodeIconHtml } from "./node-visuals.js";
import { disclose } from "./disclose.js";

export const TITLE = "6 \u00b7 LLM judge lab (coming soon)";
export const LEAD = "Check whether the LLM judge agrees with you, before you trust its grades.";
export const STATUS = "NOT BUILT YET";
// Same words as the "Known weakness" note in check-details.js (without its first word).
export const WHY =
  "this small model gave 5 out of 5 to every run we tried, even a run with a reward 10 times too high.";
export const TRY_NOTE = "The judge already runs on Checks and Side by side.";

// [pictogram id of node-visuals.js, label]. The order is the order of the planned flow.
export const STEPS = [
  ["checks", "You grade 10 replies"],
  ["rubric_judge", "The LLM judge grades the same 10"],
  ["task_success", "Compare: how often do they agree?"],
  ["retry", "Swap the order: does the judge change its mind?"],
];

export const PLANNED = [
  "Calibrate the judge against your own labels.",
  "Swap the order of two replies to find order bias.",
  "See one agreement rate: how often you and the judge agree.",
];

export function judgeLabSoonHtml() {
  const boxes = STEPS.map(
    ([icon, label]) =>
      `<li class="js-step"><span class="js-box">${nodeIconHtml(icon)}<span class="js-label">${label}</span></span></li>`,
  ).join("");
  const planned = `<p class="muted">Planned. None of this works yet.</p><ul>${PLANNED.map((t) => `<li>${t}</li>`).join("")}</ul>`;
  return (
    `<h1 id="judge-h">${TITLE}</h1>` +
    `<p class="lead">${LEAD}</p>` +
    `<p class="js-status"><b><i class="sq half" aria-hidden="true"></i> ${STATUS}</b></p>` +
    `<ol class="js-flow" aria-label="The planned flow, in order">${boxes}</ol>` +
    `<p class="js-why"><b>Why it is coming:</b> ${WHY}</p>` +
    disclose("What will you be able to do?", planned, { id: "judge-soon-planned" }) +
    `<p class="js-try"><a class="btn" href="#metrics">Try the LLM judge now &rarr;</a> <span class="muted">${TRY_NOTE}</span></p>`
  );
}
